from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from .models import EstadoExpediente, Rol


class LoginIn(BaseModel):
    username: str = Field(min_length=3, max_length=60)
    password: str = Field(min_length=1, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: Rol
    nombre: str


class UsuarioIn(BaseModel):
    username: str = Field(min_length=3, max_length=60, pattern=r"^[a-zA-Z0-9_.-]+$")
    nombre: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=10, max_length=128)  # política mínima de contraseñas
    rol: Rol


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    nombre: str
    rol: Rol
    activo: bool


class ExpedienteIn(BaseModel):
    materia: str = Field(min_length=3, max_length=60)
    demandante: str = Field(min_length=3, max_length=160)
    demandado: str = Field(min_length=3, max_length=160)
    descripcion: str = Field(default="", max_length=5000)
    juez_id: int | None = None
    abogado_id: int | None = None
    fecha_limite: date | None = None


class ExpedienteUpdate(BaseModel):
    descripcion: str | None = Field(default=None, max_length=5000)
    juez_id: int | None = None
    abogado_id: int | None = None
    fecha_limite: date | None = None


class CambioEstadoIn(BaseModel):
    estado: EstadoExpediente
    motivo: str = Field(min_length=5, max_length=1000)


class ActuacionIn(BaseModel):
    tipo: str = Field(min_length=3, max_length=60)
    detalle: str = Field(min_length=3, max_length=5000)


class ActuacionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tipo: str
    detalle: str
    fecha: datetime
    usuario_id: int


class ExpedienteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    numero: str
    materia: str
    demandante: str
    demandado: str
    descripcion: str
    estado: EstadoExpediente
    juez_id: int | None
    abogado_id: int | None
    fecha_limite: date | None
    creado_en: datetime
    actualizado_en: datetime


class ExpedienteCreadoOut(ExpedienteOut):
    codigo_consulta: str  # solo se muestra al crear: el secretario se lo entrega al ciudadano


class ExpedienteDetalleOut(ExpedienteOut):
    actuaciones: list[ActuacionOut]


class ConsultaPublicaOut(BaseModel):
    numero: str
    materia: str
    estado: EstadoExpediente
    actualizado_en: datetime
    ultima_actuacion: str | None


class AuditoriaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha: datetime
    usuario: str
    accion: str
    entidad: str
    entidad_id: str
    expediente_id: int | None = None
    antes: str
    despues: str
    ip: str
    hash: str
