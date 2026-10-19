"""Datos de demostración (solo si SEED_DEMO=1). NO usar en producción real."""
import os
from datetime import date, timedelta

from sqlalchemy.orm import Session

from . import audit
from .models import Actuacion, EstadoExpediente, Expediente, Rol, Usuario
from .security import hash_password

DEMO_PASSWORD = os.getenv("SEED_PASSWORD", "Demo-Judicial-2026")


def cargar(db: Session) -> None:
    if db.query(Usuario).count() > 0:
        return
    usuarios = [
        Usuario(username="admin1", nombre="Administración del Sistema", rol=Rol.admin),
        Usuario(username="secretario1", nombre="Secretaría Judicial Juzgado 1°", rol=Rol.secretario),
        Usuario(username="juez1", nombre="Juez Primero Civil", rol=Rol.juez),
        Usuario(username="juez2", nombre="Juez Segundo Civil", rol=Rol.juez),
        Usuario(username="abogado1", nombre="Lcda. Marta Quintero", rol=Rol.abogado),
    ]
    for u in usuarios:
        u.password_hash = hash_password(DEMO_PASSWORD)
        db.add(u)
    db.flush()
    sec, j1, j2, abg = usuarios[1], usuarios[2], usuarios[3], usuarios[4]
    hoy = date.today()
    ejemplos = [
        ("civil", "Comercial Istmo S.A.", "Juan Pérez", j1, hoy + timedelta(days=2), EstadoExpediente.en_tramite, "A1B2C3D4"),
        ("familia", "María Rodríguez", "Carlos Gómez", j1, hoy + timedelta(days=20), EstadoExpediente.radicado, "E5F6A7B8"),
        ("laboral", "Ana Castillo", "Constructora Pacífico", j2, hoy - timedelta(days=1), EstadoExpediente.en_audiencia, "C9D0E1F2"),
    ]
    for i, (materia, dte, ddo, juez, limite, estado, codigo) in enumerate(ejemplos, start=1):
        exp = Expediente(numero=f"EXP-{hoy.year}-{i:06d}", materia=materia, demandante=dte, demandado=ddo,
                         descripcion="Expediente de demostración", juez_id=juez.id, abogado_id=(abg.id if i != 2 else None), fecha_limite=limite,
                         estado=estado, codigo_consulta=codigo)
        db.add(exp)
        db.flush()
        db.add(Actuacion(expediente_id=exp.id, tipo="radicacion", detalle="Expediente radicado", usuario_id=sec.id))
        audit.registrar(db, usuario="secretario1", accion="CREAR_EXPEDIENTE", entidad="expediente", entidad_id=exp.id,
                        despues={"numero": exp.numero, "estado": "radicado"}, expediente_id=exp.id)
        # Historial de decisiones para que el demo arranque con trazabilidad visible
        if estado == EstadoExpediente.en_tramite:
            db.add(Actuacion(expediente_id=exp.id, tipo="cambio_estado",
                             detalle="radicado -> en_tramite: Se admite la demanda", usuario_id=juez.id))
            audit.registrar(db, usuario=juez.username, accion="CAMBIAR_ESTADO", entidad="expediente",
                            entidad_id=exp.id, antes={"estado": "radicado"}, despues={"estado": "en_tramite"},
                            expediente_id=exp.id)
        if estado == EstadoExpediente.en_audiencia:
            db.add(Actuacion(expediente_id=exp.id, tipo="cambio_estado",
                             detalle="radicado -> en_tramite: Se admite la demanda", usuario_id=juez.id))
            db.add(Actuacion(expediente_id=exp.id, tipo="cambio_estado",
                             detalle="en_tramite -> en_audiencia: Se fija audiencia", usuario_id=juez.id))
            audit.registrar(db, usuario=juez.username, accion="CAMBIAR_ESTADO", entidad="expediente",
                            entidad_id=exp.id, antes={"estado": "en_tramite"}, despues={"estado": "en_audiencia"},
                            expediente_id=exp.id)
    db.commit()
