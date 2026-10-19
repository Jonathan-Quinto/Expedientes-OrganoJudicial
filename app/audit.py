"""PB-03: auditoría y trazabilidad con cadena de hashes (a prueba de manipulación)."""
import hashlib
import json

from fastapi import Request
from sqlalchemy.orm import Session

from .models import Auditoria

GENESIS = "0" * 64


def _calcular_hash(reg: Auditoria) -> str:
    contenido = "|".join(
        [
            reg.hash_anterior,
            reg.fecha.isoformat(),
            reg.usuario,
            reg.accion,
            reg.entidad,
            reg.entidad_id,
            reg.antes,
            reg.despues,
        ]
    )
    return hashlib.sha256(contenido.encode()).hexdigest()


def registrar(
    db: Session,
    *,
    usuario: str,
    accion: str,
    entidad: str,
    entidad_id: str | int,
    antes: dict | None = None,
    despues: dict | None = None,
    expediente_id: int | None = None,
    request: Request | None = None,
) -> Auditoria:
    """Agrega un registro a la bitácora. Se llama dentro de la misma transacción del cambio.

    `expediente_id` solo sirve para filtrar la bitácora por expediente y NO entra en
    el cálculo del hash (así la cadena existente y /api/auditoria/verificar siguen íntegras).
    """
    from .models import ahora

    ultimo = db.query(Auditoria).order_by(Auditoria.id.desc()).first()
    reg = Auditoria(
        fecha=ahora().replace(microsecond=0),
        usuario=usuario,
        accion=accion,
        entidad=entidad,
        entidad_id=str(entidad_id),
        expediente_id=expediente_id,
        antes=json.dumps(antes or {}, ensure_ascii=False, default=str, sort_keys=True),
        despues=json.dumps(despues or {}, ensure_ascii=False, default=str, sort_keys=True),
        ip=(request.client.host if request and request.client else ""),
        hash_anterior=ultimo.hash if ultimo else GENESIS,
    )
    reg.hash = _calcular_hash(reg)
    db.add(reg)
    db.flush()  # el siguiente registro de la misma transacción debe ver este como "último"
    return reg


def verificar_cadena(db: Session) -> dict:
    anterior = GENESIS
    total = 0
    for reg in db.query(Auditoria).order_by(Auditoria.id).all():
        total += 1
        # SQLite devuelve fechas sin zona; normalizamos para recalcular igual
        if reg.fecha.tzinfo is None:
            from datetime import timezone

            reg.fecha = reg.fecha.replace(tzinfo=timezone.utc)
        if reg.hash_anterior != anterior or _calcular_hash(reg) != reg.hash:
            db.expire(reg)
            return {"integra": False, "registros": total, "roto_en_id": reg.id}
        db.expire(reg)
        anterior = reg.hash
    return {"integra": True, "registros": total, "roto_en_id": None}
