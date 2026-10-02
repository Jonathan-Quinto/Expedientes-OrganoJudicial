"""PB-05 — Consulta pública: el ciudadano ve SOLO el estado de su proceso.

Requiere número de expediente + código de consulta (entregado por el secretario).
No expone nombres de las partes ni el detalle de las actuaciones.
"""
import hmac

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import audit
from ..db import get_db
from ..models import Expediente
from ..schemas import ConsultaPublicaOut

router = APIRouter(prefix="/api/publico", tags=["consulta pública"])


@router.get("/consulta", response_model=ConsultaPublicaOut)
def consultar(numero: str, codigo: str, request: Request, db: Session = Depends(get_db)):
    exp = db.query(Expediente).filter_by(numero=numero.strip().upper()).first()
    # Mismo mensaje si no existe o si el código es incorrecto (no revelar qué expedientes existen)
    if exp is None or not hmac.compare_digest(exp.codigo_consulta, codigo.strip().upper()):
        audit.registrar(db, usuario="ciudadano", accion="CONSULTA_PUBLICA_FALLIDA", entidad="expediente",
                        entidad_id=numero[:40], request=request)
        db.commit()
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Número o código de consulta incorrecto")
    ultima = exp.actuaciones[-1].tipo if exp.actuaciones else None
    audit.registrar(db, usuario="ciudadano", accion="CONSULTA_PUBLICA", entidad="expediente",
                    entidad_id=exp.id, request=request)
    db.commit()
    return ConsultaPublicaOut(numero=exp.numero, materia=exp.materia, estado=exp.estado,
                              actualizado_en=exp.actualizado_en, ultima_actuacion=ultima)
