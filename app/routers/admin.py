"""Administrador: gestión de usuarios (PB-02) y bitácora de auditoría (PB-03)."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import audit
from ..db import get_db
from ..models import Auditoria, Rol, Usuario
from ..schemas import AuditoriaOut, UsuarioIn, UsuarioOut
from ..security import hash_password, requiere_rol

router = APIRouter(prefix="/api", tags=["administración"])
solo_admin = requiere_rol(Rol.admin)


@router.get("/usuarios", response_model=list[UsuarioOut])
def listar_usuarios(db: Session = Depends(get_db), _: Usuario = Depends(solo_admin)):
    return db.query(Usuario).order_by(Usuario.id).all()


@router.get("/jueces", response_model=list[UsuarioOut])
def listar_jueces(db: Session = Depends(get_db), _: Usuario = Depends(requiere_rol(Rol.secretario, Rol.admin))):
    """Para el selector de juez al crear un expediente."""
    return db.query(Usuario).filter_by(rol=Rol.juez, activo=True).all()


@router.post("/usuarios", response_model=UsuarioOut, status_code=201)
def crear_usuario(datos: UsuarioIn, request: Request, db: Session = Depends(get_db),
                  admin: Usuario = Depends(solo_admin)):
    if db.query(Usuario).filter_by(username=datos.username).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "El usuario ya existe")
    u = Usuario(username=datos.username, nombre=datos.nombre, rol=datos.rol,
                password_hash=hash_password(datos.password))
    db.add(u)
    db.flush()
    audit.registrar(db, usuario=admin.username, accion="CREAR_USUARIO", entidad="usuario", entidad_id=u.id,
                    despues={"username": u.username, "rol": u.rol.value}, request=request)
    db.commit()
    return u


@router.post("/usuarios/{uid}/desbloquear", response_model=UsuarioOut)
def desbloquear(uid: int, request: Request, db: Session = Depends(get_db), admin: Usuario = Depends(solo_admin)):
    u = db.get(Usuario, uid)
    if u is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    u.activo, u.intentos_fallidos = True, 0
    audit.registrar(db, usuario=admin.username, accion="DESBLOQUEAR_USUARIO", entidad="usuario",
                    entidad_id=u.id, request=request)
    db.commit()
    return u


@router.get("/auditoria", response_model=list[AuditoriaOut])
def bitacora(entidad: str | None = None, entidad_id: str | None = None, limite: int = 200,
             db: Session = Depends(get_db), _: Usuario = Depends(solo_admin)):
    q = db.query(Auditoria)
    if entidad:
        q = q.filter_by(entidad=entidad)
    if entidad_id:
        q = q.filter_by(entidad_id=entidad_id)
    return q.order_by(Auditoria.id.desc()).limit(min(limite, 1000)).all()


@router.get("/auditoria/verificar")
def verificar(db: Session = Depends(get_db), _: Usuario = Depends(solo_admin)):
    """Recalcula la cadena de hashes. integra=false => alguien alteró la bitácora."""
    return audit.verificar_cadena(db)
