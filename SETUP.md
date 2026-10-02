# Guía de instalación del equipo

Expediente Judicial Digital · Equipo 1 · Ingeniería de Software III

Esta guía deja el proyecto corriendo en tu computadora, con las pruebas funcionando y listo para trabajar con ramas y Pull Requests. Tiempo estimado: 20–30 minutos la primera vez.

---

## 1. Instalar lo necesario (una sola vez)

| Herramienta | Para qué | Descarga |
|---|---|---|
| **Git** | Clonar el repo y subir cambios | https://git-scm.com/download/win |
| **Python 3.12** | Correr el sistema y las pruebas | https://www.python.org/downloads/ |
| **VS Code** | Editor recomendado | https://code.visualstudio.com/ |

Al instalar Python **marca la casilla "Add Python to PATH"**. Si te la saltaste, reinstálalo.

Revisa en PowerShell que todo quedó bien:

```powershell
git --version
python --version
```

Si `python` abre la Microsoft Store: ve a *Configuración → Aplicaciones → Alias de ejecución de aplicaciones* y apaga los dos de Python. Cierra y abre PowerShell otra vez.

Configura tu nombre en Git (con tu correo de GitHub):

```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tucorreo@ejemplo.com"
```

> Jonathan tiene que agregarte como colaborador del repo en GitHub (*Settings → Collaborators*). Acepta la invitación que te llega al correo.

---

## 2. Clonar el proyecto

```powershell
cd $HOME\Documents
git clone https://github.com/Jonathan-Quinto/Expedientes-OrganoJudicial.git
cd Expedientes-OrganoJudicial
code .
```

---

## 3. Preparar el entorno de Python

En la terminal de VS Code (*Terminal → Nueva terminal*), dentro de la carpeta del proyecto:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

Si al activar sale **"la ejecución de scripts está deshabilitada"**, corre esto una vez y repite la activación:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Sabes que el entorno está activo cuando la línea de la terminal empieza con `(.venv)`. Cada vez que abras una terminal nueva, actívalo otra vez con `.\.venv\Scripts\Activate.ps1`.

---

## 4. Correr el sistema

```powershell
uvicorn app.main:app --reload
```

Abre http://localhost:8000

| Usuario | Rol |
|---|---|
| `secretario1` | Registra expedientes |
| `juez1` / `juez2` | Cambian estados de sus expedientes |
| `admin1` | Bitácora de auditoría |

Contraseña de todos: `Demo-Judicial-2026`

- Consulta ciudadana: http://localhost:8000/consulta (EXP-2026-000001 · código A1B2C3D4)
- Documentación de la API (Swagger): http://localhost:8000/docs

`--reload` reinicia el servidor solo cada vez que guardas un archivo. Para detenerlo: `Ctrl + C`.

Para volver a los datos iniciales, detén el servidor, borra el archivo `expedientes.db` y vuelve a arrancarlo.

---

## 5. Correr las pruebas (Robot Framework)

Con el sistema corriendo en una terminal, abre **otra terminal**, activa el entorno y ejecuta:

```powershell
.\.venv\Scripts\Activate.ps1
robot --outputdir results tests/robot
```

Tiene que terminar con `22 tests, 22 passed, 0 failed`. El reporte queda en `results/report.html`; ábrelo en el navegador. Esa captura es la **evidencia de calidad** del sprint.

Correr solo las pruebas de un ítem del backlog:

```powershell
robot --include PB-02 --outputdir results tests/robot
```

---

## 6. Cómo trabajamos con Git

**Nadie sube directo a `main`.** Todo entra por Pull Request para que el pipeline corra las pruebas.

```powershell
# 1. Antes de empezar, trae lo último
git checkout main
git pull

# 2. Crea tu rama (tipo/descripcion-corta)
git checkout -b feature/login-pantalla

# 3. Trabaja, y cuando algo funcione:
git add .
git commit -m "Pantalla de login con mensajes de error"
git push -u origin feature/login-pantalla
```

Después entra a GitHub y abre el **Pull Request** hacia `main`. Espera a que las pruebas de *Actions* salgan en verde y que alguien del equipo lo revise antes de hacer merge.

Nombres de rama: `feature/...` (algo nuevo), `fix/...` (corrección), `test/...` (pruebas), `docs/...` (documentación).

---

## 7. Dónde está cada cosa

| Carpeta | Qué hay | Quién la toca más |
|---|---|---|
| `app/routers/` | Endpoints de la API (login, expedientes, auditoría, consulta) | Javier |
| `app/models.py`, `app/security.py`, `app/audit.py` | Base de datos, seguridad y bitácora | Javier |
| `app/static/` | Pantallas (HTML, CSS, JS) | Daniela |
| `tests/robot/` | Pruebas de Robot Framework | Edwin |
| `security/openvas/` | Guía y script de OpenVAS | Edwin |
| `.github/workflows/` | Pipeline de CI/CD | Javier + Edwin |
| `k8s/`, `Dockerfile` | Despliegue (Sprint 5) | Javier |
| `docs/` | Plantilla del proyecto con los sprints | Jonathan |

---

## 8. Más adelante (no hace falta para el Sprint 1)

- **Docker Desktop**: para PostgreSQL y Kubernetes en el Sprint 5. https://www.docker.com/products/docker-desktop/
- **OpenVAS**: escaneo de seguridad en el Sprint 6. Ver `security/openvas/README.md`.

---

## Problemas comunes

| Error | Solución |
|---|---|
| `'python' no se reconoce` | Reinstala Python marcando "Add Python to PATH", o usa `py` en lugar de `python`. |
| `la ejecución de scripts está deshabilitada` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `No module named ...` | No activaste el entorno: `.\.venv\Scripts\Activate.ps1` y luego `pip install -r requirements-dev.txt` |
| `address already in use` | Ya hay un servidor corriendo. Ciérralo o usa `uvicorn app.main:app --reload --port 8080` |
| Las pruebas fallan con `ConnectionError` | El sistema no está corriendo. Arráncalo en otra terminal (paso 4). |
| Falla la prueba de bloqueo o la de bitácora | Borra `expedientes.db`, reinicia el servidor y vuelve a correr las pruebas. |
| `rejected ... fetch first` al hacer push | `git pull` en tu rama y vuelve a hacer `git push`. |

¿Algo más falla? Pega el error en el grupo y lo vemos.
