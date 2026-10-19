"""PB-02: contrasenas, tokens y validacion de configuracion de produccion."""
import importlib
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app import config, security
from app.models import Rol, Usuario


def test_hash_password_formato_y_sal_distinta():
    h1, h2 = security.hash_password("Clave-Segura-1"), security.hash_password("Clave-Segura-1")
    assert h1.startswith("pbkdf2_sha256$310000$")
    assert h1 != h2
    assert "Clave-Segura-1" not in h1


def test_verificar_password_correcta_e_incorrecta():
    h = security.hash_password("Clave-Segura-1")
    assert security.verificar_password("Clave-Segura-1", h) is True
    assert security.verificar_password("otra-clave", h) is False


@pytest.mark.parametrize("guardado", ["", "basura", "a$b$c", "a$b$c$d$e"])
def test_verificar_password_formato_invalido(guardado):
    assert security.verificar_password("x", guardado) is False


def _usuario():
    return Usuario(username="tester", rol=Rol.juez)


def test_token_valido_contiene_sub_y_rol():
    p = jwt.decode(security.crear_token(_usuario()), config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    assert p["sub"] == "tester" and p["rol"] == "juez" and "exp" in p


def test_token_con_firma_alterada_se_rechaza():
    token = security.crear_token(_usuario())
    cab, cuerpo, firma = token.split(".")
    alterada = ("A" if firma[0] != "A" else "B") + firma[1:]
    with pytest.raises(jwt.InvalidSignatureError):
        jwt.decode(f"{cab}.{cuerpo}.{alterada}", config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])


def test_token_firmado_con_otro_secreto_se_rechaza():
    falso = jwt.encode({"sub": "admin1", "rol": "admin"}, "otro-secreto-" * 4, algorithm="HS256")
    with pytest.raises(jwt.PyJWTError):
        jwt.decode(falso, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])


def test_token_expirado_se_rechaza():
    viejo = jwt.encode({"sub": "x", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
                       config.JWT_SECRET, algorithm="HS256")
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(viejo, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])


def test_token_alg_none_se_rechaza():
    sin_firma = jwt.encode({"sub": "admin1"}, None, algorithm="none")
    with pytest.raises(jwt.PyJWTError):
        jwt.decode(sin_firma, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])


def _recargar_config():
    return importlib.reload(config)


@pytest.fixture()
def restaurar_config(monkeypatch):
    yield monkeypatch
    monkeypatch.undo()
    _recargar_config()  # deja config como estaba (entorno de desarrollo)


def test_produccion_sin_secreto_lanza_runtimeerror(restaurar_config):
    restaurar_config.setenv("APP_ENV", "produccion")
    restaurar_config.delenv("JWT_SECRET", raising=False)
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        _recargar_config()


def test_produccion_con_secreto_corto_lanza_runtimeerror(restaurar_config):
    restaurar_config.setenv("APP_ENV", "produccion")
    restaurar_config.setenv("JWT_SECRET", "corto")
    with pytest.raises(RuntimeError):
        _recargar_config()


def test_produccion_con_secreto_fuerte_arranca(restaurar_config):
    restaurar_config.setenv("APP_ENV", "produccion")
    restaurar_config.setenv("JWT_SECRET", "x" * 40)
    assert _recargar_config().APP_ENV == "produccion"


def test_desarrollo_acepta_secreto_por_defecto(restaurar_config):
    restaurar_config.setenv("APP_ENV", "desarrollo")
    restaurar_config.delenv("JWT_SECRET", raising=False)
    assert _recargar_config().JWT_SECRET.startswith("demo-local")
