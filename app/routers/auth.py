"""PB-02 — HU-02: Como usuario del sistema quiero iniciar sesión con mi rol."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import audit
from ..db import get_db
from ..models import Usuario
from ..schemas import LoginIn, TokenOut, UsuarioOut
from ..security import MAX_INTENTOS, crear_token, usuario_actual, verificar_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(datos: LoginIn, request: Request, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter_by(username=datos.username).first()
    error = HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario o contraseña incorrectos")

    if usuario is None:
        audit.registrar(db, usuario=datos.username, accion="LOGIN_FALLIDO", entidad="usuario",
                        entidad_id="-", request=request)
        db.commit()
        raise error

    if not usuario.activo:
        raise HTTPException(status.HTTP_423_LOCKED, "Cuenta bloqueada. Contacte al administrador")

    if not verificar_password(datos.password, usuario.password_hash):
        usuario.intentos_fallidos += 1
        if usuario.intentos_fallidos >= MAX_INTENTOS:
            usuario.activo = False  # bloqueo tras 5 intentos (mitiga fuerza bruta)
        audit.registrar(db, usuario=datos.username, accion="LOGIN_FALLIDO", entidad="usuario",
                        entidad_id=usuario.id, request=request)
        db.commit()
        raise error

    usuario.intentos_fallidos = 0
    audit.registrar(db, usuario=usuario.username, accion="LOGIN_OK", entidad="usuario",
                    entidad_id=usuario.id, request=request)
    db.commit()
    return TokenOut(access_token=crear_token(usuario), rol=usuario.rol, nombre=usuario.nombre)


@router.get("/me", response_model=UsuarioOut)
def yo(usuario: Usuario = Depends(usuario_actual)):
    return usuario
