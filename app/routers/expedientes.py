"""PB-01 (gestión de expedientes) y PB-06 (alertas de plazo).

Permisos:
  secretario -> crea expedientes, edita datos, registra actuaciones
  juez       -> consulta los expedientes que tiene asignados y cambia su estado (decide)
  admin      -> consulta todo (no modifica expedientes)
  abogado    -> consulta sus expedientes (abogado_id) y presenta escritos (actuaciones); nada más
"""
import secrets
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import audit
from ..config import ALERTA_DIAS
from ..db import get_db
from ..models import Actuacion, Auditoria, EstadoExpediente, Expediente, Rol, Usuario
from ..schemas import (
    ActuacionIn,
    ActuacionOut,
    AuditoriaOut,
    CambioEstadoIn,
    ExpedienteCreadoOut,
    ExpedienteDetalleOut,
    ExpedienteIn,
    ExpedienteOut,
    ExpedienteUpdate,
)
from ..security import requiere_rol, usuario_actual

router = APIRouter(prefix="/api/expedientes", tags=["expedientes"])

TODOS = (Rol.juez, Rol.secretario, Rol.abogado, Rol.admin)


def _snapshot(exp: Expediente) -> dict:
    return {
        "numero": exp.numero,
        "estado": exp.estado.value,
        "descripcion": exp.descripcion,
        "juez_id": exp.juez_id,
        "abogado_id": exp.abogado_id,
        "fecha_limite": exp.fecha_limite,
    }


def _obtener(db: Session, exp_id: int, usuario: Usuario) -> Expediente:
    exp = db.get(Expediente, exp_id)
    if exp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expediente no encontrado")
    # Un juez solo ve sus propios expedientes (mínimo privilegio)
    if usuario.rol == Rol.juez and exp.juez_id != usuario.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Expediente no asignado a este juez")
    # Un abogado solo ve los expedientes donde es abogado de parte
    if usuario.rol == Rol.abogado and exp.abogado_id != usuario.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Expediente no asignado a este abogado")
    return exp


def _validar_asignados(db: Session, juez_id: int | None = None, abogado_id: int | None = None) -> None:
    """422 si juez_id no es un juez o abogado_id no es un abogado (None = sin asignar)."""
    for uid, rol, campo in ((juez_id, Rol.juez, "juez_id"), (abogado_id, Rol.abogado, "abogado_id")):
        if uid is not None:
            u = db.get(Usuario, uid)
            if u is None or u.rol != rol:
                raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"{campo} no corresponde a un {rol.value}")


def _siguiente_numero(db: Session) -> str:
    anio = date.today().year
    n = db.query(Expediente).count() + 1
    return f"EXP-{anio}-{n:06d}"


@router.get("", response_model=list[ExpedienteOut])
def listar(
    q: str | None = None,
    estado: EstadoExpediente | None = None,
    materia: str | None = None,
    juez_id: int | None = None,
    plazo_desde: date | None = None,
    plazo_hasta: date | None = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(requiere_rol(*TODOS)),
):
    consulta = db.query(Expediente)
    if usuario.rol == Rol.juez:
        consulta = consulta.filter(Expediente.juez_id == usuario.id)
    if usuario.rol == Rol.abogado:
        consulta = consulta.filter(Expediente.abogado_id == usuario.id)
    if estado:
        consulta = consulta.filter(Expediente.estado == estado)
    if materia:
        consulta = consulta.filter(Expediente.materia.ilike(materia))
    if juez_id is not None:
        consulta = consulta.filter(Expediente.juez_id == juez_id)
    if plazo_desde:
        consulta = consulta.filter(Expediente.fecha_limite >= plazo_desde)
    if plazo_hasta:
        consulta = consulta.filter(Expediente.fecha_limite <= plazo_hasta)
    if q:
        like = f"%{q}%"
        consulta = consulta.filter(
            Expediente.numero.ilike(like) | Expediente.demandante.ilike(like) | Expediente.demandado.ilike(like)
        )
    return consulta.order_by(Expediente.id.desc()).all()


@router.post("", response_model=ExpedienteCreadoOut, status_code=201)
def crear(
    datos: ExpedienteIn,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(requiere_rol(Rol.secretario)),
):
    _validar_asignados(db, datos.juez_id, datos.abogado_id)
    exp = Expediente(**datos.model_dump(), numero=_siguiente_numero(db), codigo_consulta=secrets.token_hex(4).upper())
    db.add(exp)
    db.flush()
    db.add(Actuacion(expediente_id=exp.id, tipo="radicacion", detalle="Expediente radicado", usuario_id=usuario.id))
    audit.registrar(db, usuario=usuario.username, accion="CREAR_EXPEDIENTE", entidad="expediente",
                    entidad_id=exp.id, despues=_snapshot(exp), expediente_id=exp.id, request=request)
    db.commit()
    return exp


@router.get("/alertas", response_model=list[ExpedienteOut])
def alertas_plazo(
    dias: int = ALERTA_DIAS,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(requiere_rol(*TODOS)),
):
    """PB-06: expedientes con plazo vencido o que vence en los próximos `dias` días."""
    limite = date.today() + timedelta(days=dias)
    consulta = db.query(Expediente).filter(
        Expediente.fecha_limite.is_not(None),
        Expediente.fecha_limite <= limite,
        Expediente.estado.not_in(["con_sentencia", "archivado"]),
    )
    if usuario.rol == Rol.juez:
        consulta = consulta.filter(Expediente.juez_id == usuario.id)
    if usuario.rol == Rol.abogado:
        consulta = consulta.filter(Expediente.abogado_id == usuario.id)
    return consulta.order_by(Expediente.fecha_limite).all()


@router.get("/{exp_id}", response_model=ExpedienteDetalleOut)
def detalle(
    exp_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(requiere_rol(*TODOS)),
):
    exp = _obtener(db, exp_id, usuario)
    # Las consultas también se registran: en un expediente judicial importa quién lo vio
    audit.registrar(db, usuario=usuario.username, accion="CONSULTAR_EXPEDIENTE", entidad="expediente",
                    entidad_id=exp.id, expediente_id=exp.id, request=request)
    db.commit()
    return exp


@router.get("/{exp_id}/auditoria", response_model=list[AuditoriaOut])
def auditoria_expediente(
    exp_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(requiere_rol(Rol.juez, Rol.secretario, Rol.admin)),
):
    """PB-03: historial de auditoría de un expediente, en orden cronológico."""
    exp = _obtener(db, exp_id, usuario)
    return db.query(Auditoria).filter(Auditoria.expediente_id == exp.id).order_by(Auditoria.id).all()


@router.patch("/{exp_id}", response_model=ExpedienteOut)
def editar(
    exp_id: int,
    datos: ExpedienteUpdate,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(requiere_rol(Rol.secretario)),
):
    exp = _obtener(db, exp_id, usuario)
    antes = _snapshot(exp)
    _validar_asignados(db, datos.juez_id, datos.abogado_id)
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(exp, campo, valor)
    audit.registrar(db, usuario=usuario.username, accion="EDITAR_EXPEDIENTE", entidad="expediente",
                    entidad_id=exp.id, antes=antes, despues=_snapshot(exp), expediente_id=exp.id, request=request)
    db.commit()
    return exp


@router.post("/{exp_id}/estado", response_model=ExpedienteOut)
def cambiar_estado(
    exp_id: int,
    datos: CambioEstadoIn,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(requiere_rol(Rol.juez)),
):
    exp = _obtener(db, exp_id, usuario)
    antes = _snapshot(exp)
    exp.estado = datos.estado
    db.add(Actuacion(expediente_id=exp.id, tipo="cambio_estado",
                     detalle=f"{antes['estado']} -> {datos.estado.value}: {datos.motivo}", usuario_id=usuario.id))
    audit.registrar(db, usuario=usuario.username, accion="CAMBIAR_ESTADO", entidad="expediente",
                    entidad_id=exp.id, antes=antes, despues=_snapshot(exp), expediente_id=exp.id, request=request)
    db.commit()
    return exp


@router.post("/{exp_id}/actuaciones", response_model=ActuacionOut, status_code=201)
def agregar_actuacion(
    exp_id: int,
    datos: ActuacionIn,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(requiere_rol(Rol.secretario, Rol.juez, Rol.abogado)),
):
    exp = _obtener(db, exp_id, usuario)
    act = Actuacion(expediente_id=exp.id, tipo=datos.tipo, detalle=datos.detalle, usuario_id=usuario.id)
    db.add(act)
    db.flush()
    audit.registrar(db, usuario=usuario.username, accion="AGREGAR_ACTUACION", entidad="actuacion",
                    entidad_id=act.id, despues={"expediente": exp.numero, **datos.model_dump()},
                    expediente_id=exp.id, request=request)
    db.commit()
    return act
