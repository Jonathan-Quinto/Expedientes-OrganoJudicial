# OpenVAS — escaneo de seguridad (PB-04)

OpenVAS (Greenbone Community Edition) escanea **la máquina y los puertos expuestos** donde corre el sistema
(el nodo de Kubernetes de staging). Encuentra servicios vulnerables, versiones desactualizadas,
configuraciones TLS débiles, etc.

> No va en el pipeline de GitHub Actions: la primera sincronización de sus bases de vulnerabilidades
> tarda horas. Se corre **una vez por sprint** contra staging y el reporte es la evidencia de seguridad.

## 1. Levantar Greenbone (una sola vez, en la PC de Edwin o Javier)

Seguir la guía oficial de *Greenbone Community Containers*:
https://greenbone.github.io/docs/latest/22.4/container/

En resumen: descargar su `docker-compose.yml`, `docker compose up -d`, esperar a que termine
la sincronización de feeds, y entrar a https://127.0.0.1:9392 (usuario `admin`).

## 2. Levantar staging local

```bash
minikube start            # o kind create cluster --name staging
# desplegar con los manifiestos de k8s/ (ver README principal)
minikube ip               # esta IP es el objetivo del escaneo, puerto 30080
```

## 3. Escanear

Desde la interfaz web (Scans → Tasks → New Task), **o** con el script:

```bash
pip install python-gvm lxml
python escanear.py --host $(minikube ip) --puertos 30080 --password <clave-admin>
```

Deja en `reportes/` el XML completo y un resumen `.md` con conteo High/Medium/Low.

## 4. Qué poner en la plantilla (Evidencias de seguridad)

- Captura del dashboard de Greenbone con el resultado.
- Tabla: hallazgo → severidad → acción tomada (corregido / aceptado / falso positivo).
- Comparación con el sprint anterior (¿bajaron los High/Medium?).

## Controles de seguridad que ya trae el MVP (para contrastar con el escaneo)

| Control | Dónde |
|---|---|
| Contraseñas con PBKDF2-SHA256 (310k iteraciones) | `app/security.py` |
| JWT con expiración, rechazo de tokens alterados | `app/security.py` |
| Bloqueo de cuenta tras 5 intentos fallidos | `app/routers/auth.py` |
| Control de acceso por rol y por juez asignado | `app/routers/expedientes.py` |
| Bitácora con cadena de hashes (detecta manipulación) | `app/audit.py` |
| Cabeceras HTTP de seguridad (CSP, X-Frame-Options…) | `app/main.py` |
| Contenedor sin root, sistema de archivos de solo lectura | `Dockerfile`, `k8s/03-app.yaml` |
| Secretos fuera del repo (Kubernetes Secret) | `k8s/secret.example.yaml` |

---

## Escaneo Sprint 5

> **ESTADO: PENDIENTE DE EJECUCIÓN.** Esta sección es solo la guía. A 2026-10-19 no se ha corrido el
> escaneo, así que **no hay resultados** y no debe copiarse ninguno al informe hasta que exista un reporte real.
> Los hallazgos de la revisión estática están en `security/INFORME-SEGURIDAD.md`.

**Antes de empezar:** escanee solo el staging propio del equipo. No apunte Greenbone a máquinas de terceros ni a la red de la universidad sin permiso.

### A. Levantar Greenbone Community Edition con docker compose

Requisitos: Docker Desktop (Windows) con ~8 GB de RAM libres y unas horas para la primera sincronización de feeds.
Los comandos siguen la guía oficial (https://greenbone.github.io/docs/latest/22.4/container/). Verifique allí
el nombre exacto del archivo compose, porque cambia entre versiones.

```powershell
# PowerShell
$env:DOWNLOAD_DIR = "$HOME\greenbone-community-container"
New-Item -ItemType Directory -Force $env:DOWNLOAD_DIR | Out-Null
Set-Location $env:DOWNLOAD_DIR
curl.exe -f -L https://greenbone.github.io/docs/latest/_static/docker-compose-22.4.yml -o docker-compose.yml

docker compose -f docker-compose.yml -p greenbone-community-edition pull
docker compose -f docker-compose.yml -p greenbone-community-edition up -d
```

1. Espere a que los feeds terminen de sincronizar (puede tardar horas). Mientras sincroniza, Administration → Feed Status
   muestra "Update in progress"; no lance el escaneo hasta que diga "Current".
2. Defina la clave del administrador:
   ```powershell
   docker compose -f docker-compose.yml -p greenbone-community-edition exec -u gvmd gvmd gvmd --user=admin --new-password='<clave-segura>'
   ```
3. Abra http://127.0.0.1:9392 e inicie sesión con `admin` y esa clave.

### B. Definir el objetivo (IP:NodePort del servicio)

El Service de la API es `NodePort` 30080 (`k8s/03-app.yaml`). El objetivo es la **IP del nodo** y el puerto **30080**.

```powershell
kubectl -n expediente-judicial get svc expediente-api     # confirma el nodePort (30080)
kubectl get nodes -o wide                                 # columna INTERNAL-IP
minikube ip                                               # si usa minikube
```

- minikube con driver Hyper-V o VirtualBox: la IP es alcanzable desde Windows. Con el driver Docker en Windows
  la IP no es alcanzable desde los contenedores de Greenbone; use otro driver o publique el puerto con
  `kubectl -n expediente-judicial port-forward --address 0.0.0.0 svc/expediente-api 30080:80` y use la IP de la PC.
- kind: el nodo es un contenedor; sin `extraPortMappings` el NodePort no sale al host.
- Compruebe antes que el servicio responde: `curl.exe http://<IP>:30080/healthz` debe devolver `{"status":"ok"}`.

En Greenbone:
1. Configuration → Targets → New Target. Nombre `staging-expedientes-sprint5`. Hosts = `<IP-del-nodo>`.
2. Port List: cree una lista propia con `T:30080` (alcance mínimo: solo la API) o use "All IANA assigned TCP" si quiere
   revisar también los puertos del nodo (22, 6443, 10250, etc.). Anote cuál eligió en la tabla de resultados.
3. Alive Test: "Consider Alive" (evita falsos "host muerto" con ICMP bloqueado).

### C. Crear y lanzar la tarea con "Full and fast"

1. Scans → Tasks → New Task. Nombre `Sprint 5 - staging`.
2. Scan Targets = el objetivo del paso anterior.
3. Scan Config = **Full and fast** (es la configuración estándar: usa los chequeos NVT con buen equilibrio entre cobertura y tiempo, y no ejecuta pruebas peligrosas).
4. Guarde y presione el botón de inicio (Start). Tiempo típico: entre 15 minutos y 1 hora para un solo host y un puerto.
5. Alternativa por línea de comandos, con el script del repositorio (no sustituye la configuración "Full and fast" si el script usa otra):
   ```powershell
   pip install python-gvm lxml
   python escanear.py --host <IP-del-nodo> --puertos 30080 --password <clave-admin>
   ```

### D. Exportar el reporte a `security/reportes/`

1. Scans → Reports → abra el reporte de la tarea.
2. Download Filtered Report: formato **PDF** (para la entrega) y **XML** (para análisis o comparación). Si no aparece el filtro,
   use "Apply to page contents" y asegúrese de que el filtro **no** oculte nada por QoD.
3. Guárdelos en `security/reportes/` (créela si no existe) con nombre fechado, por ejemplo
   `sprint5-2026-10-XX-staging.pdf` y `sprint5-2026-10-XX-staging.xml`.
4. Tome una captura del dashboard de la tarea para la plantilla de evidencias.
5. Si el reporte contiene la IP o datos internos, revise antes de publicarlo en un repositorio público.

### E. Interpretar la severidad (CVSS)

Greenbone da a cada resultado un puntaje CVSS (0.0-10.0):

| CVSS | Nivel | Qué hacer |
|---|---|---|
| 9.0 - 10.0 | Crítica | Corregir antes de cerrar el sprint. |
| 7.0 - 8.9 | Alta | Corregir en este sprint o justificar y planificar. |
| 4.0 - 6.9 | Media | Planificar para el siguiente sprint. |
| 0.1 - 3.9 | Baja | Evaluar costo y beneficio; puede aceptarse. |
| 0.0 | Log / Info | Informativo (por ejemplo servicios detectados). |

Criterios para interpretar:
- **QoD (Quality of Detection):** el porcentaje de certeza de la detección. Un resultado con QoD menor de 70 % es probable falso positivo: verifíquelo a mano antes de actuar.
- **Vector CVSS:** vea `AV` (red, local), `AC` (complejidad), `PR` (privilegios). Una vulnerabilidad `AV:N/AC:L/PR:N` es explotable por cualquiera en la red.
- **Contexto:** el puntaje es genérico. Un hallazgo sobre un componente que el sistema no usa puede ser falso positivo; uno sobre un puerto expuesto fuera del NodePort 30080 puede ser del propio nodo, no de la aplicación.
- **Estados de la columna "Decisión":** Corregido, Aceptado (con justificación), Falso positivo (con evidencia), En el backlog (con ID).
- Cruce los resultados con la tabla de `INFORME-SEGURIDAD.md`: por ejemplo, la falta de TLS (SEC-14) y las cabeceras (SEC-17, SEC-18) deberían aparecer o no en el escaneo; anote las coincidencias y las diferencias.
- El escaneo de red **no** detecta fallas de lógica como IDOR, bloqueo de cuentas o la bitácora (SEC-04, SEC-09, SEC-10): esos solo salen de la revisión de código.

### F. Plantilla para registrar los resultados

Datos del escaneo (rellenar después de ejecutar):

| Campo | Valor |
|---|---|
| Estado | PENDIENTE DE EJECUCIÓN |
| Fecha y hora | |
| Ejecutado por | |
| Versión de Greenbone y fecha del feed | |
| Objetivo (IP:puerto) | |
| Lista de puertos | |
| Configuración | Full and fast |
| Versión/commit desplegado en staging | |
| Archivos del reporte | `security/reportes/...` |
| Conteo | Alta: _ / Media: _ / Baja: _ / Log: _ |

Resultados:

| # | NVT / hallazgo | Host:puerto | CVSS | Severidad | QoD | Decisión (corregido / aceptado / falso positivo / backlog) | Responsable | Relación con el informe (SEC-xx) | Estado |
|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | |
| 2 | | | | | | | | | |
| 3 | | | | | | | | | |

Comparación con el sprint anterior (¿bajaron los High/Medium?):

| Severidad | Sprint anterior | Sprint 5 | Variación |
|---|---|---|---|
| Alta | | | |
| Media | | | |
| Baja | | | |
