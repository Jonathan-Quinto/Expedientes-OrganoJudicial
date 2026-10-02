# Expediente Judicial Digital — MVP

**Caso 1: Congestión Judicial (Órgano Judicial de Panamá)** · Ingeniería de Software III · Equipo 1

> **¿Primera vez? Sigue la [guía de instalación del equipo](SETUP.md).**

Sistema para digitalizar expedientes judiciales con trazabilidad completa, control de acceso por roles
y bitácora de auditoría a prueba de manipulación.

| Herramienta | Uso en el proyecto |
|---|---|
| **Python** (FastAPI + SQLAlchemy) | Backend / API REST + frontend estático |
| **Robot Framework** | Pruebas de aceptación por historia de usuario (`tests/robot/`) |
| **OpenVAS** | Escaneo de vulnerabilidades de staging cada sprint (`security/openvas/`) |
| **Kubernetes** + Docker + GitHub Actions | CI/CD: pruebas → imagen → despliegue (`k8s/`, `.github/workflows/`) |

## Correr en local (2 minutos)

```bash
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

- App: http://localhost:8000 · Consulta ciudadana: http://localhost:8000/consulta
- Documentación de la API (Swagger): http://localhost:8000/docs

Usuarios demo (contraseña `Demo-Judicial-2026`): `secretario1`, `juez1`, `juez2`, `admin1`.
Consulta pública demo: `EXP-2026-000001` + código `A1B2C3D4`.

Con PostgreSQL (como en el Sprint 0): `docker compose up --build`

## Pruebas (evidencia de calidad)

Con la app corriendo en otra terminal:

```bash
robot --outputdir results tests/robot
# abre results/report.html  -> captura para la plantilla
robot --include PB-02 --outputdir results tests/robot   # solo las de un ítem del backlog
```

## Kubernetes (staging local con minikube o kind)

```bash
minikube start
eval $(minikube docker-env) && docker build -t expediente-api:latest .
kubectl apply -f k8s/00-namespace.yaml
kubectl -n expediente-judicial create secret generic app-secrets \
  --from-literal=JWT_SECRET=$(openssl rand -hex 32) \
  --from-literal=POSTGRES_PASSWORD=claveLocal123 \
  --from-literal=DATABASE_URL=postgresql+psycopg://judicial:claveLocal123@postgres:5432/expedientes
kubectl apply -f k8s/01-configmap.yaml -f k8s/02-postgres.yaml -f k8s/03-app.yaml
kubectl -n expediente-judicial get pods
minikube service expediente-api -n expediente-judicial --url
```

## CI/CD

`.github/workflows/ci-cd.yml` corre en cada push/PR a `main` o `develop`:

1. **pruebas** — levanta la API y corre toda la suite de Robot Framework (reporte como artifact).
2. **desplegar-staging** — crea un cluster Kubernetes (kind), construye la imagen, despliega app + PostgreSQL,
   espera el rollout y vuelve a correr Robot Framework **contra el cluster**.

La captura de la pestaña *Actions* en verde es la evidencia de DevOps de cada sprint.

## Mapa backlog → código

| ID | Ítem | Pts | Código | Pruebas |
|---|---|---|---|---|
| PB-01 | Gestión de expedientes digitales | 8 | `app/routers/expedientes.py` | `02_expedientes.robot` |
| PB-02 | Autenticación y control de roles | 5 | `app/security.py`, `app/routers/auth.py` | `01_autenticacion.robot` |
| PB-03 | Auditoría y trazabilidad | 5 | `app/audit.py`, `app/routers/admin.py` | `03_auditoria.robot` |
| PB-04 | Seguridad, cifrado y OpenVAS | 5 | `app/main.py`, `security/openvas/` | `04_consulta_publica.robot` (tag PB-04) |
| PB-05 | Consulta pública | 5 | `app/routers/publico.py`, `static/consulta.*` | `04_consulta_publica.robot` |
| PB-06 | Alertas y notificaciones de plazo | 3 | `GET /api/expedientes/alertas` | `02_expedientes.robot` (tag PB-06) |
| PB-07 | Pipeline CI/CD Kubernetes | 5 | `.github/workflows/`, `k8s/`, `Dockerfile` | job `desplegar-staging` |

## Estructura

```
app/            backend FastAPI (modelos, seguridad, auditoría, routers) + static/ (frontend)
tests/robot/    suites de Robot Framework por ítem del backlog
k8s/            manifiestos de Kubernetes (namespace, config, postgres, app)
security/       OpenVAS: guía + script de escaneo
.github/        pipeline CI/CD
```

## Pendiente para próximos sprints (ideas)

- Migraciones con Alembic en lugar de `create_all`.
- Adjuntar documentos PDF al expediente (con hash SHA-256 por archivo).
- Notificación por correo de plazos (hoy solo se muestran en el panel).
- Frontend en React/Vue si Daniela lo prefiere; la API ya está lista.
