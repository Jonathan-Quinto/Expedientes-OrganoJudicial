"""PB-02: autenticación (JWT) y control de acceso por roles."""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET
from .db import get_db
from .models import Rol, Usuario

PBKDF2_ITERACIONES = 310_000  # recomendación OWASP para PBKDF2-SHA256
MAX_INTENTOS = 5

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), PBKDF2_ITERACIONES)
    return f"pbkdf2_sha256${PBKDF2_ITERACIONES}${salt}${dk.hex()}"


def verificar_password(password: str, guardado: str) -> bool:
    try:
        _, iteraciones, salt, hash_hex = guardado.split("$")
    except ValueError:
        return False
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iteraciones))
    return hmac.compare_digest(dk.hex(), hash_hex)


def crear_token(usuario: Usuario) -> str:
    payload = {
        "sub": usuario.username,
        "rol": usuario.rol.value,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def usuario_actual(
    cred: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    if cred is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta token")
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o expirado")
    usuario = db.query(Usuario).filter_by(username=payload.get("sub")).first()
    if usuario is None or not usuario.activo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no válido")
    return usuario


def requiere_rol(*roles: Rol):
    """Uso: Depends(requiere_rol(Rol.secretario, Rol.juez))"""

    def _dep(usuario: Usuario = Depends(usuario_actual)) -> Usuario:
        if usuario.rol not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Su rol no tiene permiso para esta acción")
        return usuario

    return _dep
