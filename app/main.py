"""Expediente Judicial Digital — MVP (Caso 1: Congestión Judicial)."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from .config import SEED_DEMO
from .db import Base, SessionLocal, engine
from .routers import admin, auth, expedientes, publico

STATIC = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)  # en sprints posteriores: migrar a Alembic
    if SEED_DEMO:
        from .seed import cargar

        from sqlalchemy.exc import IntegrityError

        with SessionLocal() as db:
            try:
                cargar(db)
            except IntegrityError:  # otra réplica ya cargó los datos demo
                db.rollback()
    yield


app = FastAPI(title="Expediente Judicial Digital", version="0.1.0", lifespan=lifespan)


@app.middleware("http")
async def cabeceras_seguridad(request: Request, call_next):
    """PB-04: cabeceras HTTP de seguridad (las revisa OpenVAS / cualquier escáner web)."""
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Content-Security-Policy"] = "default-src 'self'; style-src 'self' 'unsafe-inline'"
    resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if "server" in resp.headers:
        del resp.headers["server"]
    return resp


app.include_router(auth.router)
app.include_router(expedientes.router)
app.include_router(publico.router)
app.include_router(admin.router)


@app.get("/healthz", tags=["ops"])
def healthz():
    """Liveness/readiness para Kubernetes."""
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ok"}


app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/consulta", include_in_schema=False)
def consulta_page():
    return FileResponse(STATIC / "consulta.html")
