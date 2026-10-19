# Informe de seguridad: Sprint 5

Proyecto: Expediente Judicial Digital (Equipo 1, Ingeniería de Software III)
Fecha de detección de todos los hallazgos: **2026-10-19**
Alcance: revisión estática de `app/` (FastAPI), `app/static/` (frontend vanilla), `Dockerfile`, `k8s/` y `.github/workflows/ci-cd.yml`.
Método: lectura de código contra OWASP Top 10 2021. No se ejecutó ningún comando ni escáner.
Escaneo OpenVAS del Sprint 5: **PENDIENTE DE EJECUCIÓN** (ver `security/openvas/README.md`). Este informe no contiene resultados de OpenVAS.

Las severidades usan un CVSS v3.1 aproximado: Crítica 9.0-10, Alta 7.0-8.9, Media 4.0-6.9, Baja 0.1-3.9, Info sin impacto directo.

## 1. Resumen ejecutivo

El MVP tiene una base sólida: contraseñas con PBKDF2 (310 000 iteraciones), JWT con rol leído de la base de datos, control de acceso por rol y por asignación en todos los endpoints, bitácora encadenada con SHA-256, frontend con `esc()` y CSP sin scripts en línea, y un contenedor endurecido. Revisé el control de acceso entre jueces y abogados en todos los endpoints y **no encontré IDOR explotable** (sección 4).

Los riesgos reales están en tres zonas:

1. **Configuración que falla abierta.** Si falta una variable de entorno, la app arranca con un secreto JWT público y con usuarios demo con clave conocida (SEC-01, SEC-02). El staging ya corre con `SEED_DEMO=1` y la clave pública `Demo-Judicial-2026`, expuesto por NodePort sin TLS (SEC-03).
2. **Autenticación sin límites de tasa.** Cualquiera puede bloquear la cuenta de cualquier usuario, incluido `admin1`, con 5 intentos (SEC-04). No hay rate limiting en login ni en la consulta pública (SEC-06, SEC-07).
3. **Integridad de la bitácora.** La cadena de hashes detecta ediciones torpes, pero `expediente_id` e `ip` quedan fuera del hash (SEC-09), el hash no lleva clave (SEC-10) y las escrituras concurrentes pueden bifurcar la cadena y producir falsos "bitácora alterada" (SEC-11).

Conteo: **28 hallazgos. Crítica 0, Alta 4, Media 10, Baja 11, Info 3.** Todos en estado Abierto.

## 2. Tabla de hallazgos

Fecha de detección de todos: 2026-10-19.

| ID | OWASP 2021 | archivo:línea | Descripción | Severidad | Recomendación | Estado |
|---|---|---|---|---|---|---|
| SEC-01 | A02 Fallas criptográficas / A05 | `app/config.py:8,11,13` | `JWT_SECRET` tiene un valor por defecto público y la guarda que lo rechaza solo actúa si `APP_ENV=produccion`, cuyo valor por defecto es `desarrollo`. Si se omite la variable (por ejemplo `docker run` sin `-e`), la app arranca y cualquiera puede forjar un token con `rol: admin` (el `sub` se busca en BD, basta un username existente como `admin1`). CVSS ~8.1 (AC:H por requerir el error de despliegue). | Alta | Fallar cerrado: sin `JWT_SECRET` la app no arranca, en cualquier `APP_ENV`. Eliminar el valor por defecto del código. | Abierto |
| SEC-02 | A05 Configuración / A07 | `app/config.py:22`, `app/seed.py:11,18-22` | `SEED_DEMO` vale `"1"` por defecto: toda instancia que no lo apague crea 5 usuarios (incluido `admin1`) con la clave `Demo-Judicial-2026`, publicada en `README.md:28`, `SETUP.md:84` y `tests/robot/resources/common.resource:8`. Los códigos de consulta demo también son fijos (`seed.py:31-33`). CVSS ~9.8 si llega a una instancia expuesta. | Alta | Por defecto `SEED_DEMO=0`. Activarlo solo de forma explícita. Que `SEED_PASSWORD` sea obligatorio cuando `SEED_DEMO=1`, y generar los códigos de consulta con `secrets`. | Abierto |
| SEC-03 | A07 Autenticación / A05 | `k8s/01-configmap.yaml:12`, `k8s/03-app.yaml:63-68` | El staging de Kubernetes corre con `SEED_DEMO="1"` (clave pública) y el Service es NodePort 30080 por HTTP. Quien alcance el nodo entra como `admin1`, `juez1`, etc. Los datos son ficticios, por eso Alta; sería Crítica si el staging contiene datos reales o es accesible desde internet. El propio ConfigMap documenta la excepción para Robot. | Alta | Generar una clave aleatoria por despliegue (secreto de CI inyectado en `SEED_PASSWORD` y pasado a Robot). Limitar el NodePort a la red del equipo (firewall o NetworkPolicy). | Abierto |
| SEC-04 | A07 Fallas de identificación y autenticación / A04 | `app/routers/auth.py:29-31`, `app/routers/admin.py:47-56` | El bloqueo por 5 intentos se aplica a la cuenta, no al origen, y no expira. Un atacante anónimo bloquea a cualquier usuario conocido (los nombres demo están en `app/static/index.html:29`). Si bloquea a todos los `admin`, nadie puede desbloquear: solo `admin` tiene `/desbloquear` y no existe otra vía. CVSS ~7.5 (A:H). | Alta | Bloqueo temporal con expiración (por ejemplo 15 min) y backoff. Limitar por IP además de por cuenta. Vía de recuperación fuera de banda para el admin. | Abierto |
| SEC-05 | A07 / A01 | `app/routers/auth.py:19-23,25-26,28` | Enumeración de usuarios en el login: (a) tras 5 fallos un usuario existente responde 423 "Cuenta bloqueada" y uno inexistente siempre 401; (b) un usuario inactivo responde 423 sin pedir contraseña; (c) un usuario inexistente responde sin ejecutar PBKDF2 (310 000 iteraciones), así que el tiempo de respuesta lo delata. El mensaje de texto sí es uniforme (`auth.py:17`). CVSS ~5.3. | Media | Responder siempre 401 genérico. Ejecutar un PBKDF2 ficticio cuando el usuario no existe. No revelar el bloqueo antes de validar la clave. | Abierto |
| SEC-06 | A07 / A04 | `app/main.py:33-61`, `app/routers/auth.py:14`, `requirements.txt:1-5` | No hay rate limiting en ningún endpoint (no existe middleware ni dependencia tipo slowapi). En el login permite password spraying (una clave contra todos los usuarios; el contador es por cuenta y nunca decae) y agotar CPU, porque cada intento contra un usuario existente cuesta un PBKDF2 con límite del pod de 500m (`k8s/03-app.yaml:49`). CVSS ~5.3-7.5. | Media | Rate limit por IP y por usuario en `/api/auth/login` y `/api/publico/consulta` (slowapi, o a nivel de Ingress/WAF). | Abierto |
| SEC-07 | A07 / A04 | `app/routers/expedientes.py:70-73,118`, `app/routers/publico.py:20-27` | Consulta pública: el número de expediente es secuencial y predecible (`EXP-AAAA-NNNNNN`) y el código tiene 32 bits (`secrets.token_hex(4)`). Sin rate limit ni bloqueo, se puede probar por fuerza bruta. El esfuerzo esperado es ~2^31 intentos por expediente; a 500 req/s son ~50 días, pero no hay nada que lo impida o lo alerte. Lo expuesto es poco (materia, estado, tipo de última actuación). CVSS ~5.3. | Media | Código de 8+ caracteres alfanuméricos (≥ 48 bits), contador de fallos por expediente y por IP con bloqueo temporal, CAPTCHA. | Abierto |
| SEC-08 | A09 Registro y monitoreo / A02 | `app/routers/publico.py:20`, `app/static/consulta.js:8-9` | El código de consulta (una credencial) viaja en la query string de un GET. Queda en los access logs de uvicorn, de cualquier proxy o Ingress y en el historial del navegador. `Referrer-Policy: no-referrer` (`main.py:42`) evita la fuga por referer, pero no el resto. CVSS ~4.3. | Media | Cambiar a `POST` con cuerpo JSON, o excluir la query de los logs de acceso. | Abierto |
| SEC-09 | A09 Registro y monitoreo / A08 Integridad | `app/audit.py:13-26,43-44`, `app/models.py:95,98` | `expediente_id` e `ip` están fuera del hash (`_calcular_hash` solo cubre `hash_anterior`, `fecha`, `usuario`, `accion`, `entidad`, `entidad_id`, `antes`, `despues`). Con acceso de escritura a la BD se puede hacer `UPDATE auditoria SET expediente_id=...` y mover o ocultar registros de la pestaña de auditoría por expediente (`expedientes.py:171`) sin que `/api/auditoria/verificar` lo detecte. Se puede alterar la `ip` igual. Detalle de la evaluación en la sección 5. CVSS ~4.9 en la vista por expediente. | Media | Incluir `expediente_id` e `ip` en el hash con un campo `version` (v1 = fórmula actual para registros existentes, v2 = fórmula extendida). Añadir a `verificar_cadena` el cruce `entidad=="expediente" and entidad_id==expediente_id`. | Abierto |
| SEC-10 | A08 Fallas de integridad / A09 | `app/audit.py:26,67-82` | La cadena usa SHA-256 sin clave y sin ancla externa. Quien tenga escritura en la BD puede modificar un registro y recalcular todos los siguientes: la verificación pasa. También puede borrar los últimos N registros sin que se note (no hay contador ni hash de cabecera guardado fuera de la BD). La cadena detecta ediciones puntuales, no a un atacante con privilegios. El rol de BD de la app es dueño de la tabla y puede hacer `UPDATE` y `DELETE` (`k8s/02-postgres.yaml:26-29`). CVSS ~4.9. | Media | HMAC-SHA256 con clave en un Secret fuera de la BD. Publicar periódicamente el hash de cabecera fuera de la BD (log externo o WORM). Trigger o rol que niegue `UPDATE`/`DELETE` sobre `auditoria`. | Abierto |
| SEC-11 | A04 Diseño inseguro / A09 | `app/audit.py:48,61-63`, `k8s/03-app.yaml:8` | `registrar` lee el último registro sin bloqueo y calcula sobre él. Con 2 réplicas y peticiones concurrentes, dos transacciones leen el mismo "último" y generan dos registros con el mismo `hash_anterior`. Después `verificar_cadena` informa "bitácora alterada" sin que nadie haya manipulado nada. Un anónimo puede provocarlo a voluntad por SEC-12. Mina la credibilidad del control. CVSS ~5.3 (A:L, I:M). | Media | Serializar con `SELECT ... FOR UPDATE` sobre el último registro, o un `pg_advisory_xact_lock` antes de leerlo. | Abierto |
| SEC-12 | A04 / A09 | `app/routers/publico.py:24-26`, `app/routers/auth.py:19-23`, `app/routers/admin.py:70-73`, `app/audit.py:70` | Escritura anónima en la bitácora: cada consulta pública fallida y cada login con usuario inexistente añade una fila a la cadena global sin autenticación ni límite. Infla la tabla y hace que `verificar_cadena` (que hace `.all()` en memoria) sea cada vez más lento. Mezcla además ruido del atacante con la evidencia legítima. CVSS ~5.3. | Media | Rate limit (SEC-06). No encadenar los eventos anónimos fallidos en la misma cadena: contadores o log aparte con rotación. `verificar_cadena` por lotes. | Abierto |
| SEC-13 | A04 Diseño inseguro / A08 | `app/routers/expedientes.py:212-228`, `app/schemas.py:58-60`, `app/static/app.js:206-208` | `tipo` de una actuación es texto libre y no se valida: un abogado (usuario externo) puede registrar `tipo=cambio_estado` con detalle `en_tramite -> con_sentencia: ...`, y la línea de tiempo la muestra como un cambio de estado oficial (la UI no muestra el autor). Tampoco se impide agregar escritos a expedientes `con_sentencia` o `archivado`. La cadena de auditoría sí registra al autor real. CVSS ~4.3. | Media | Lista cerrada de `tipo` por rol (el abogado solo `escrito`). Reservar `radicacion` y `cambio_estado` al sistema. Mostrar el autor en la línea de tiempo. Rechazar escritos en expedientes cerrados. | Abierto |
| SEC-14 | A02 Fallas criptográficas | `k8s/03-app.yaml:63-68`, `app/main.py:44`, `k8s/02-postgres.yaml:26-30` | No hay TLS: el Service es NodePort por HTTP y no existe Ingress. Credenciales y JWT viajan en claro. El header HSTS (`main.py:44`) se emite pero no tiene efecto sobre HTTP. La conexión a PostgreSQL tampoco fuerza `sslmode`. CVSS ~5.9 (AC:H, requiere posición de red). | Media | Ingress con TLS (cert-manager). `sslmode=require` en `DATABASE_URL`. | Abierto |
| SEC-15 | A05 Configuración | `k8s/` (no existe NetworkPolicy), `k8s/00-namespace.yaml:1-4`, `k8s/02-postgres.yaml:42-44` | Sin NetworkPolicy: cualquier pod del cluster alcanza PostgreSQL (5432). El namespace no tiene etiquetas de Pod Security Admission. El contenedor de Postgres no declara `readOnlyRootFilesystem`. | Baja | NetworkPolicy default-deny y permitir solo `app -> postgres:5432`. Etiquetar el namespace con `pod-security.kubernetes.io/enforce: restricted`. | Abierto |
| SEC-16 | A05 Configuración | `app/main.py:33` | `FastAPI(...)` no desactiva `docs_url`, `redoc_url` ni `openapi_url`: `/docs`, `/redoc` y `/openapi.json` quedan expuestos también con `APP_ENV=produccion`. Revelan toda la superficie de la API. La CSP (`main.py:43`) impide que Swagger cargue sus scripts del CDN, pero `/openapi.json` sigue visible. CVSS ~3.7. | Baja | `docs_url=None, redoc_url=None, openapi_url=None` cuando `APP_ENV=="produccion"`. | Abierto |
| SEC-17 | A05 Configuración | `app/main.py:43`, `app/static/index.html:11` | CSP incompleta: `style-src 'unsafe-inline'`, y faltan `frame-ancestors`, `base-uri` y `form-action`. Las respuestas de la API no llevan `Cache-Control: no-store` aunque contienen datos del caso. Mitigante: `script-src` hereda `'self'` (no hay scripts en línea), que es lo importante contra XSS. CVSS ~3.1. | Baja | `default-src 'self'; style-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'` (mover los estilos en línea a CSS). `Cache-Control: no-store` en `/api/*`. | Abierto |
| SEC-18 | A05 Configuración | `app/main.py:45-46`, `Dockerfile:19` | Se intenta borrar la cabecera `server` en el middleware, pero uvicorn la agrega después, a nivel de protocolo, así que sigue saliendo `server: uvicorn` y delata el stack. CVSS ~2.0. | Baja | Lanzar uvicorn con `--no-server-header` y quitar el código inútil del middleware. | Abierto |
| SEC-19 | A01 Control de acceso | `app/routers/expedientes.py:50-57` | `_obtener` responde 404 si el expediente no existe y 403 si existe pero no pertenece al juez o abogado: sirve de oráculo de existencia de IDs (que además son secuenciales). Bajo impacto: no devuelve datos. CVSS ~3.1. | Baja | Responder 404 en ambos casos a juez y abogado. | Abierto |
| SEC-20 | A09 Registro y monitoreo | `app/routers/auth.py:20,32`, `app/schemas.py:9` | `LOGIN_FALLIDO` guarda el campo `username` tal como llegó, sin patrón (a diferencia de `UsuarioIn`, `schemas.py:21`). Si un usuario escribe su clave en el campo usuario, queda guardada en la bitácora, que por diseño es inmutable, y el admin la ve. También permite meter contenido arbitrario en el registro (el frontend lo escapa, ver sección 3). CVSS ~3.7. | Baja | Validar `username` con el mismo patrón en `LoginIn`. Si no cumple, registrar un valor genérico. | Abierto |
| SEC-21 | A09 Registro y monitoreo | `app/audit.py:58`, `Dockerfile:19`, `k8s/03-app.yaml:63-68` | La IP de auditoría es `request.client.host`. Con NodePort (`externalTrafficPolicy: Cluster` por defecto) kube-proxy hace SNAT y uvicorn solo confía en `X-Forwarded-For` desde 127.0.0.1 (`--proxy-headers` sin `--forwarded-allow-ips`), así que la IP guardada será la del nodo, no la del cliente. Debilita el "desde dónde" del registro. | Baja | `externalTrafficPolicy: Local` o un Ingress de confianza con `--forwarded-allow-ips` acotado. | Abierto |
| SEC-22 | A06 Componentes vulnerables | `requirements.txt:1-5`, `requirements-dev.txt:2-3`, `.github/workflows/ci-cd.yml:21,112` | Dependencias con límite inferior, sin versión fija, sin lockfile ni hashes (`fastapi>=0.115,<1.0`, `uvicorn[standard]>=0.30`, `pyjwt>=2.8`, `psycopg[binary]>=3.2`). Dos builds del mismo commit pueden traer versiones distintas. El pipeline no ejecuta `pip-audit` ni un escáner de imagen (Trivy). | Baja | Fijar con `pip-compile --generate-hashes` (o `uv lock`) y añadir `pip-audit` y Trivy al CI. | Abierto |
| SEC-23 | A08 Fallas de integridad de software | `Dockerfile:1,7`, `k8s/03-app.yaml:25`, `k8s/02-postgres.yaml:24`, `.github/workflows/ci-cd.yml:1-9,18,86` | Imágenes base por tag y no por digest (`python:3.12-slim`, `postgres:16-alpine`); el manifiesto usa `expediente-api:latest` (el pipeline lo reemplaza por SHA, pero el manifiesto suelto no). Las acciones de GitHub se fijan a tag mayor (`@v4`, `helm/kind-action@v1`), no a SHA. El workflow no declara `permissions:`, así que hereda los permisos por defecto del repositorio. | Baja | Fijar por digest, declarar `permissions: contents: read`, fijar acciones por SHA. | Abierto |
| SEC-24 | A04 Diseño inseguro | `app/routers/admin.py:60,67`, `app/routers/expedientes.py:76-107,130-135,70-73` | Parámetros sin acotar: `limite` negativo (SQLite lo trata como "sin límite", PostgreSQL da 500); `dias` enorme provoca `OverflowError` y 500; el listado de expedientes no tiene paginación; `_siguiente_numero` usa `count()+1`, que ante dos altas simultáneas choca con la restricción única y devuelve 500. CVSS ~3.1. | Baja | `Query(ge=1, le=1000)`, `Query(ge=0, le=365)`, paginación, y una secuencia de BD para el número. | Abierto |
| SEC-25 | A07 Autenticación | `app/security.py:37-43`, `app/static/app.js:74`, `app/routers/admin.py` (no hay endpoints de cambio de clave ni de desactivación) | El token vive 60 min y no se puede revocar: "Salir" solo recarga la página (`app.js:74`). El token no lleva `iat` ni `jti`. No existe endpoint para que un usuario cambie su clave (las del seed no se pueden rotar desde la app) ni para desactivar un usuario (solo desbloquear). Mitigante: `usuario_actual` consulta la BD en cada petición y rechaza usuarios inactivos (`security.py:57`). | Baja | Endpoint de cambio de clave, desactivación de usuarios, `jti` con lista de revocación y expiración corta con refresh. | Abierto |
| SEC-26 | A03 Inyección | `app/routers/expedientes.py:95,103-106` | `ilike` recibe `materia` y `q` sin escapar los comodines `%` y `_`: el usuario controla el patrón. No es inyección SQL (SQLAlchemy parametriza), y el filtro por rol se aplica antes, así que no hay fuga entre roles. Solo patrones costosos. | Info | Escapar con `.ilike(..., escape="\\")` y comparar `materia` por igualdad. | Abierto |
| SEC-27 | A03 Inyección (XSS) | `app/static/app.js:53,113-118,136-143,296-298` | Valores sin `esc()` dentro de `innerHTML`, pero todos son numéricos o constantes: `t` y `v` del nav (`:53`, literales), `e.id` y `x.id` (enteros de la API, `:117,136,137,143`), `v.registros` y `v.roto_en_id` (enteros, `:297-298`) y la salida de `fechaHora` (`:289`, `:248`, construida con números). Hoy no es explotable. Fragilidad si el esquema cambia. | Info | Pasar todo por `esc()` o `Number()` como defensa en profundidad. | Abierto |
| SEC-28 | (proceso) | `security/openvas/README.md` | El escaneo OpenVAS del Sprint 5 contra el staging **está PENDIENTE DE EJECUCIÓN**. No hay resultados de red, TLS ni versiones de servicios. Este informe es solo revisión estática. | Info | Ejecutar con la guía "Escaneo Sprint 5" y registrar los resultados. | Abierto |

Conteo por severidad: Crítica 0 | Alta 4 (SEC-01..04) | Media 10 (SEC-05..14) | Baja 11 (SEC-15..25) | Info 3 (SEC-26..28).

## 3. Revisión a fondo de los puntos pedidos

### CORS
No hay `CORSMiddleware` en `app/main.py` ni en ningún router. FastAPI no agrega cabeceras CORS por defecto, así que el navegador solo permite el uso desde el mismo origen. El frontend se sirve desde la misma aplicación (`main.py:64-74`). Está bien así: **sin hallazgo**. Si se añade CORS más adelante, usar una lista cerrada de orígenes y no `*` con credenciales.

### CSP e `innerHTML` en `app.js`
- CSP (`main.py:43`): `default-src 'self'` bloquea scripts en línea y de terceros. Es la mitigación fuerte frente a XSS. Observaciones menores en SEC-17.
- `esc()` está en `app.js:5` y escapa `& < > " '`, por lo que es seguro tanto en nodos de texto como en atributos entre comillas.
- Recorrido de todos los `innerHTML` de `app.js`:
  - `:53` nav: solo literales.
  - `:65` `esc(nombre)` y `esc(ROLES[rol] || rol)`.
  - `:113-118` tabla de expedientes: `numero`, `materia`, `demandante`, `demandado`, `estado` y `p.txt` pasan por `esc()`. `data-id="${e.id}"` es un entero.
  - `:136,137,143` selects: `esc(x.nombre)`; el `value` es un entero.
  - `:179` y `:190`: `esc(e.numero)`, `esc(e.codigo_consulta)`, `esc(msg)`.
  - `:206-208` línea de tiempo: `esc(TIPOS[a.tipo] || a.tipo)` y `esc(a.detalle...)`.
  - `:244-249` auditoría por expediente: `esc(accionTxt)`, `esc(r.usuario)`, `esc(c)`, `esc(r.ip)`, `esc(hash)`.
  - `:289-291` bitácora global: `esc(r.usuario)`, `esc(r.accion)` (también dentro de `class="..."`), `esc(r.entidad)`, `esc(r.entidad_id)`, `esc(cambio(r))`, `esc(r.hash.slice)`.
  - `:296-298`: sin `esc` pero con enteros (SEC-27).
- Vector relevante: el campo `usuario` de la bitácora lo controla un anónimo (usuario inexistente en el login, `auth.py:20`) y lo ve el admin. Pasa por `esc()` en `app.js:289` y `:247`, así que un `<img onerror>` queda inerte; además la CSP lo bloquearía. **Conclusión: todo dato de texto del servidor pasa por `esc()`; las excepciones son enteros.**
- `consulta.js` (página pública) usa `textContent` para todo dato de la API; su único `innerHTML` (`:11`, `:21`) es una plantilla constante. Correcto.
- El token JWT está solo en memoria (`app.js:2,3`), sin `localStorage`: bien.

### Logs con datos sensibles
- La aplicación no usa `logging` ni `print`. No escribe contraseñas ni JWT en logs.
- Los access logs de uvicorn sí contienen la URL completa de la consulta pública, con el código (SEC-08).
- El nombre de usuario de un login fallido se guarda en la bitácora tal cual (SEC-20).
- La bitácora guarda `antes`/`despues` con datos del caso (`expedientes.py:225` guarda el detalle completo de la actuación): al ser inmutable no se puede borrar un dato personal erróneo. Es una decisión de diseño a documentar.

### `/docs` expuesto
Ver SEC-16. Confirmado: `FastAPI(title=..., version=..., lifespan=...)` sin desactivar nada (`main.py:33`).

### Dependencias sin versión fija
Ver SEC-22 y SEC-23.

### securityContext en Kubernetes
- Deployment de la API (`k8s/03-app.yaml:18-22,50-53`): `runAsNonRoot`, `runAsUser: 10001`, `seccompProfile: RuntimeDefault`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities.drop: ALL`, `automountServiceAccountToken: false`, volumen `emptyDir` en `/tmp`, requests y limits. **Bien.**
- StatefulSet de PostgreSQL (`k8s/02-postgres.yaml:15-21,42-44`): `runAsNonRoot`, UID 70, seccomp, sin escalada, `drop: ALL`. Falta `readOnlyRootFilesystem` (SEC-15).
- Faltan NetworkPolicy y etiquetas de Pod Security Admission (SEC-15), y TLS (SEC-14).

## 4. Matriz de control de acceso (IDOR entre jueces y abogados)

Resultado: **ningún endpoint permite a un juez o abogado leer o modificar un expediente ajeno.** La asignación se verifica en un único punto, `_obtener` (`expedientes.py:48-58`): un juez solo accede si `exp.juez_id == usuario.id` y un abogado solo si `exp.abogado_id == usuario.id`. Los listados filtran en la consulta.

| Endpoint | Roles permitidos | Verificación de asignación | Resultado |
|---|---|---|---|
| `GET /api/expedientes` (`:76-107`) | todos | Filtro SQL por `juez_id` o `abogado_id` (`:88-91`). Un `juez_id=` ajeno enviado por un juez se combina con `AND` y devuelve vacío | Sin IDOR |
| `GET /api/expedientes/alertas` (`:128-145`) | todos | Filtro SQL por rol (`:141-144`) | Sin IDOR |
| `GET /api/expedientes/{id}` (`:148-160`) | todos | `_obtener` (incluye actuaciones en la respuesta) | Sin IDOR (oráculo 403/404: SEC-19) |
| `GET /api/expedientes/{id}/auditoria` (`:163-171`) | juez, secretario, admin | `_obtener`; el abogado queda fuera por rol | Sin IDOR |
| `POST /api/expedientes/{id}/estado` (`:193-209`) | solo juez | `_obtener` | Sin IDOR |
| `POST /api/expedientes/{id}/actuaciones` (`:212-228`) | secretario, juez, abogado | `_obtener` | Sin IDOR; abuso de contenido en SEC-13 |
| `POST /api/expedientes`, `PATCH /api/expedientes/{id}` (`:110-190`) | solo secretario | Rol; el secretario administra todos por diseño. `_validar_asignados` comprueba que `juez_id` sea juez y `abogado_id` sea abogado | Sin IDOR |
| `GET /api/auditoria`, `/api/auditoria/verificar` (`admin.py:59-73`) | solo admin | Rol (`solo_admin`) | Sin IDOR: ni juez ni abogado acceden a la bitácora global |
| `GET /api/usuarios`, `POST /api/usuarios`, `POST /api/usuarios/{uid}/desbloquear` (`admin.py:15-56`) | solo admin | Rol | Sin IDOR |
| `GET /api/jueces`, `GET /api/abogados` (`admin.py:20-29`) | secretario, admin | Rol | Sin IDOR |
| `GET /api/publico/consulta` (`publico.py:19-33`) | anónimo | Número + código; mismo 404 en ambos fallos | Ver SEC-07, SEC-08 |

Sobre `/actuaciones`: no existe un endpoint GET independiente. Las actuaciones se leen dentro de `GET /api/expedientes/{id}` (protegido por `_obtener`) y se crean con el POST de la tabla. Ambos pasan por `_obtener`.

Notas:
- El rol de autorización sale de la BD en cada petición (`security.py:56-58`), no del claim `rol` del JWT. Un cambio de rol o una desactivación surten efecto de inmediato.
- Un abogado ve la línea de tiempo completa de su expediente, incluidos los motivos de los jueces (`cambio_estado`). Es coherente con "abogado de parte", pero conviene confirmarlo con el cliente.
- Un juez que pierde la asignación pierde el acceso a la vista por expediente; la bitácora global conserva sus acciones previas.

## 5. Evaluación: `expediente_id` fuera del hash

**Qué pasa.** `audit.py:13-26` calcula el hash sobre ocho campos; `expediente_id` (`models.py:95`) y `ip` (`models.py:98`) no están. Se usa solo para filtrar la pestaña de auditoría por expediente (`expedientes.py:171`).

**Qué permite.** Un actor con escritura en la tabla `auditoria` puede cambiar `expediente_id` (o ponerlo en `NULL`) y `verificar_cadena` seguirá devolviendo `integra: true`. Efectos:
- Sacar de la historia de un expediente un `CAMBIAR_ESTADO` o `EDITAR_EXPEDIENTE` incómodo, o atribuirlo a otro expediente.
- Cambiar la `ip` de origen de cualquier registro.

**Atenuantes.**
- Para las acciones sobre `entidad="expediente"`, `entidad_id` sí está en el hash y contiene el id del expediente; un cruce `entidad_id == expediente_id` detectaría la reasignación. Ese cruce hoy no existe en `verificar_cadena`.
- Para `AGREGAR_ACTUACION` (`entidad="actuacion"`, `expedientes.py:224`) el vínculo con el expediente está solo en `expediente_id`, pero el número de expediente va en `despues`, que sí está en el hash.
- La bitácora global (`/api/auditoria`) sigue mostrando el registro con su `entidad_id`; lo que se oculta es la vista por expediente.
- Requiere privilegios de BD o acceso al cluster; no hay ruta HTTP para modificarlo.

**Severidad: Media** (CVSS ~4.9 con impacto I:H en la vista por expediente; bajaría a Baja si solo se considerara la bitácora global). Sube de importancia porque la propuesta de valor del sistema es la trazabilidad por expediente, y el control que se presenta como a prueba de manipulación tiene un campo editable en silencio. Es barato de corregir.

**Corrección propuesta.** Incluir ambos campos en el hash con un número de versión por registro (registros existentes = v1, con la fórmula actual; nuevos = v2 con `expediente_id` e `ip`) para no romper la cadena existente, y añadir el cruce de coherencia a `verificar_cadena`. Combinar con SEC-10 (HMAC con clave fuera de la BD) y SEC-11 (bloqueo al encadenar).

## 6. Controles implementados (lo que está bien)

| Control | Evidencia (archivo:línea) | Categoría |
|---|---|---|
| Hash de contraseñas PBKDF2-SHA256, 310 000 iteraciones, sal aleatoria de 16 bytes | `app/security.py:16,22-25` | A02 |
| Comparación en tiempo constante de hashes y del código de consulta | `app/security.py:34`, `app/routers/publico.py:23` | A02 |
| JWT con expiración y algoritmo fijo en la validación (`algorithms=[JWT_ALGORITHM]`, sin `alg: none`) | `app/security.py:41,53` | A02 |
| Rol y estado activo leídos de la BD en cada petición | `app/security.py:56-58` | A01 |
| `requiere_rol` en todos los endpoints de negocio | `expedientes.py:85,115,132,153,167,180,199,218`; `admin.py:12,16,21,27` | A01 |
| Mínimo privilegio por asignación (juez y abogado) en un punto único | `app/routers/expedientes.py:48-58,88-91,141-144` | A01 |
| Guarda de arranque: con `APP_ENV=produccion` exige `JWT_SECRET` propio de ≥ 32 caracteres | `app/config.py:13-17` | A02 |
| Bloqueo de cuenta tras 5 intentos fallidos (con las limitaciones de SEC-04) | `app/security.py:17`, `app/routers/auth.py:29-31` | A07 |
| Mensaje uniforme "Usuario o contraseña incorrectos" | `app/routers/auth.py:17` | A07 |
| Consulta pública: mismo mensaje y 404 si el expediente no existe o el código falla; respuesta mínima sin nombres de partes | `app/routers/publico.py:23-27`, `app/schemas.py:96-101` | A01 |
| Bitácora encadenada con SHA-256 y verificación (`/api/auditoria/verificar`) | `app/audit.py:13-26,67-82`, `app/routers/admin.py:70-73` | A09 |
| Se auditan también las consultas (`CONSULTAR_EXPEDIENTE`), los logins fallidos y exitosos y las consultas públicas | `expedientes.py:157`, `auth.py:20,32,38`, `publico.py:24,29` | A09 |
| Registro en la misma transacción del cambio (`db.flush()` + un solo `commit`) | `app/audit.py:41,63`, `expedientes.py:122-124` | A09 |
| Validación de entrada con Pydantic: longitudes máximas y patrón de `username` al crear | `app/schemas.py:20-24,36-60` | A03 |
| Sin SQL en bruto: ORM de SQLAlchemy con parámetros ligados | `app/routers/*.py` | A03 |
| Respuestas tipadas (`response_model`) que no filtran `password_hash` ni `codigo_consulta` (este solo en la creación) | `app/schemas.py:27-33,88-90` | A01 |
| XSS: `esc()` en todo texto del servidor dentro de `innerHTML` y `textContent` en la página pública | `app/static/app.js:5`, `app/static/consulta.js:22-26` | A03 |
| Token JWT en memoria, nunca en `localStorage` | `app/static/app.js:2-3` | A02 |
| Cabeceras: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, CSP, HSTS | `app/main.py:36-47` | A05 |
| CORS no habilitado (solo mismo origen) | `app/main.py` (sin `CORSMiddleware`) | A05 |
| Alta de usuarios solo por admin, con clave ≥ 10 caracteres; el `rol` se valida con enum | `app/routers/admin.py:32-44`, `app/schemas.py:23` | A07 |
| Contenedor: multi-stage, usuario no root (UID 10001), `HEALTHCHECK` | `Dockerfile:1-19` | A05 |
| Pod endurecido: `runAsNonRoot`, seccomp, sin escalada, `readOnlyRootFilesystem`, `drop: ALL`, sin token de ServiceAccount, límites de recursos | `k8s/03-app.yaml:18-22,47-55` | A05 |
| Secretos fuera del repo: `Secret` generado en CI con `openssl rand` y solo ejemplo en el repo | `k8s/secret.example.yaml`, `.github/workflows/ci-cd.yml:96-100` | A02 |
| Configuración de producción sin datos demo documentada | `k8s/produccion/01-configmap.yaml:12` | A05 |
| `.dockerignore` excluye `.git`, `.venv`, `*.db`, `security`, `tests` | `.dockerignore:1-11` | A05 |

## 7. Relación con la pregunta del cliente (trazabilidad y auditoría)

Interpreto la pregunta del cliente como: "¿pueden demostrar quién hizo qué sobre un expediente, cuándo, y que ese registro no fue alterado?".

**Lo que el sistema ya responde con evidencia.**
- Quién y cuándo: cada alta, edición, cambio de estado, actuación, consulta de expediente, login y consulta pública genera un registro con usuario, acción, entidad, fecha, estado antes y después, IP y hash (`audit.py:29-64`).
- Que no se alteró: `/api/auditoria/verificar` recalcula la cadena y señala el primer registro roto (`audit.py:67-82`). Se muestra al administrador con el botón "Verificar integridad" (`app.js:294-300`).
- Vista por expediente: `GET /api/expedientes/{id}/auditoria` para juez, secretario y admin. El abogado no la ve.
- Las consultas también se registran, lo que responde "quién vio este expediente".

**Lo que hoy no se puede afirmar sin reservas.**
1. "La cadena no puede alterarse": quien tenga acceso de escritura a la BD puede recalcularla completa o truncar el final (SEC-10).
2. "El historial por expediente es completo": `expediente_id` e `ip` son editables sin romper la verificación (SEC-09).
3. "La verificación es fiable": con peticiones concurrentes puede dar falsos positivos (SEC-11) y un anónimo puede forzarlos (SEC-12).
4. "La IP identifica el origen": detrás de NodePort probablemente será la del nodo (SEC-21).
5. "Una actuación mostrada como oficial lo es": un abogado puede registrar una actuación con apariencia de cambio de estado (SEC-13). El autor real queda en la bitácora, pero no en la línea de tiempo.

**Respuesta recomendada para el cliente.** El sistema detecta alteraciones accidentales y ediciones directas puntuales (evidencia de manipulación), no impide ni detecta de forma concluyente a un administrador de BD con mala intención. Para cubrir ese escenario hacen falta, en este orden: SEC-09 (hash extendido con versión), SEC-11 (bloqueo), SEC-10 (HMAC + ancla externa + `UPDATE`/`DELETE` denegados a la app).

## 8. Plan de remediación sugerido (orden)

1. SEC-01, SEC-02, SEC-03: fallar cerrado y quitar la clave pública del staging. Pocas líneas, mayor reducción de riesgo.
2. SEC-04, SEC-05, SEC-06, SEC-07: bloqueo temporal, 401 genérico, rate limiting y código de consulta más fuerte.
3. SEC-09, SEC-11, SEC-10: integridad de la bitácora.
4. SEC-13, SEC-08, SEC-14: tipos de actuación cerrados, consulta por POST, TLS.
5. Baja e Info: endurecimiento y limpieza. Ejecutar el escaneo OpenVAS (SEC-28) y reconciliar los resultados con esta tabla.
