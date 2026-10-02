"""Configuración leída de variables de entorno (12-factor).

En Kubernetes estas variables vienen de un ConfigMap / Secret (ver k8s/).
"""
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./expedientes.db")
JWT_SECRET = os.getenv("JWT_SECRET", "demo-local-cambiar-en-produccion-2026-expediente")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
# Días antes del vencimiento de un plazo para generar alerta (PB-06)
ALERTA_DIAS = int(os.getenv("ALERTA_DIAS", "5"))
# Si es "1", crea usuarios y expedientes de prueba al arrancar
SEED_DEMO = os.getenv("SEED_DEMO", "1") == "1"
