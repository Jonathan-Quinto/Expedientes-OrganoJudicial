"""Modelo de datos del MVP.

Usuario      -> PB-02 (autenticación y control de roles)
Expediente   -> PB-01 (gestión de expedientes digitales)
Actuacion    -> PB-01 (cada paso del proceso dentro del expediente)
Auditoria    -> PB-03 (trazabilidad: quién, qué, cuándo, antes/después)
"""
import enum
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def ahora() -> datetime:
    return datetime.now(timezone.utc)


class Rol(str, enum.Enum):
    juez = "juez"
    secretario = "secretario"
    abogado = "abogado"
    admin = "admin"


class EstadoExpediente(str, enum.Enum):
    radicado = "radicado"
    en_tramite = "en_tramite"
    en_audiencia = "en_audiencia"
    con_sentencia = "con_sentencia"
    archivado = "archivado"


class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[Rol] = mapped_column(Enum(Rol))
    activo: Mapped[bool] = mapped_column(default=True)
    intentos_fallidos: Mapped[int] = mapped_column(Integer, default=0)


class Expediente(Base):
    __tablename__ = "expedientes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String(40), unique=True, index=True)  # ej. EXP-2026-000001
    materia: Mapped[str] = mapped_column(String(60))  # civil, familia, laboral...
    demandante: Mapped[str] = mapped_column(String(160))
    demandado: Mapped[str] = mapped_column(String(160))
    descripcion: Mapped[str] = mapped_column(Text, default="")
    estado: Mapped[EstadoExpediente] = mapped_column(Enum(EstadoExpediente), default=EstadoExpediente.radicado)
    juez_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    abogado_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)  # abogado de parte
    fecha_limite: Mapped[date | None] = mapped_column(Date, nullable=True)  # próximo plazo procesal (PB-06)
    codigo_consulta: Mapped[str] = mapped_column(String(20))  # lo recibe el ciudadano para consulta pública (PB-05)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora, onupdate=ahora)

    actuaciones: Mapped[list["Actuacion"]] = relationship(back_populates="expediente", order_by="Actuacion.id")
    juez: Mapped[Usuario | None] = relationship(foreign_keys=[juez_id])
    abogado: Mapped[Usuario | None] = relationship(foreign_keys=[abogado_id])


class Actuacion(Base):
    __tablename__ = "actuaciones"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    expediente_id: Mapped[int] = mapped_column(ForeignKey("expedientes.id"), index=True)
    tipo: Mapped[str] = mapped_column(String(60))  # demanda, notificación, auto, audiencia, sentencia...
    detalle: Mapped[str] = mapped_column(Text)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)

    expediente: Mapped[Expediente] = relationship(back_populates="actuaciones")
    usuario: Mapped[Usuario] = relationship()


class Auditoria(Base):
    """Bitácora inmutable con cadena de hashes.

    Cada registro guarda el hash del registro anterior. Si alguien modifica
    una fila directamente en la base de datos, la cadena se rompe y
    GET /api/auditoria/verificar lo detecta.
    """
    __tablename__ = "auditoria"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    usuario: Mapped[str] = mapped_column(String(60))
    accion: Mapped[str] = mapped_column(String(60))  # LOGIN_OK, CREAR_EXPEDIENTE, CAMBIAR_ESTADO...
    entidad: Mapped[str] = mapped_column(String(40))
    entidad_id: Mapped[str] = mapped_column(String(40))
    expediente_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)  # fuera del hash
    antes: Mapped[str] = mapped_column(Text, default="")  # JSON
    despues: Mapped[str] = mapped_column(Text, default="")  # JSON
    ip: Mapped[str] = mapped_column(String(64), default="")
    hash_anterior: Mapped[str] = mapped_column(String(64))
    hash: Mapped[str] = mapped_column(String(64))
