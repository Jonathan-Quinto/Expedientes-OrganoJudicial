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
