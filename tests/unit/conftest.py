"""Fixtures compartidas. La BD temporal se fija ANTES de importar la app."""
import os
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
if str(RAIZ) not in sys.path:
    sys.path.insert(0, str(RAIZ))

_TMP = tempfile.mkdtemp(prefix="expedientes-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_TMP, 'test.db').as_posix()}"
os.environ["SEED_DEMO"] = "1"
os.environ.pop("APP_ENV", None)

import pytest  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

PASSWORD = "Demo-Judicial-2026"


@pytest.fixture()
def db_mem():
    """Sesion sobre SQLite en memoria, aislada por prueba."""
    from app.db import Base
    from app import models  # noqa: F401  (registra las tablas)

    eng = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    sesion = sessionmaker(bind=eng, autoflush=False, expire_on_commit=False)()
    try:
        yield sesion
    finally:
        sesion.close()
        eng.dispose()


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture(scope="session")
def tokens(client):
    def _login(u):
        r = client.post("/api/auth/login", json={"username": u, "password": PASSWORD})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    return {u: _login(u) for u in ("admin1", "secretario1", "juez1", "juez2", "abogado1")}


@pytest.fixture(scope="session")
def ids(client, tokens):
    r = client.get("/api/usuarios", headers=tokens["admin1"])
    return {u["username"]: u["id"] for u in r.json()}
