"""Configuración leída de variables de entorno (12-factor).

En Kubernetes estas variables vienen de un ConfigMap / Secret (ver k8s/).
"""
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./expedientes.db")
JWT_SECRET = os.getenv("JWT_SECRET", "demo-local-cambiar-en-produccion-2026-expediente")
JWT_ALGORITHM = "HS256"
# "produccion" exige un JWT_SECRET propio y fuerte (si no, la app no arranca)
APP_ENV = os.getenv("APP_ENV", "desarrollo")
_JWT_SECRET_DEFECTO = "demo-local-cambiar-en-produccion-2026-expediente"
if APP_ENV == "produccion" and (JWT_SECRET == _JWT_SECRET_DEFECTO or len(JWT_SECRET) < 32):
    raise RuntimeError(
        "APP_ENV=produccion: JWT_SECRET debe definirse por variable de entorno, "
        "distinto del valor por defecto y de al menos 32 caracteres."
    )
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
# Días antes del vencimiento de un plazo para generar alerta (PB-06)
ALERTA_DIAS = int(os.getenv("ALERTA_DIAS", "5"))
# Si es "1", crea usuarios y expedientes de prueba al arrancar
SEED_DEMO = os.getenv("SEED_DEMO", "1") == "1"
