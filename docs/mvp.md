# MVP: Expediente Judicial Digital · Anterior vs. Sprint 5

**Equipo 1 · Caso 1: Congestión Judicial (Órgano Judicial de Panamá)** · Fecha: 2026-10-19 · Sprint 5

**Fuentes:** `docs/historias-usuario.md`, `docs/metricas.md`, `tests/DEFECTOS.md`, `security/INFORME-SEGURIDAD.md`, `README.md` y el historial de commits indicado por el orquestador.

**Equipo:** Leonardo Liang (Product Owner) · Jonathan Quinto (Scrum Master) · Javier Pravia (Dev Backend) · Daniela Anaya (Dev Frontend) · Edwin Cisneros (QA)

---

## 1. Línea base: MVP anterior

**Referencia:** commits `9b6c2cd` (2026-10-01, Sprint 0: base del MVP) y `faa0e1c` (2026-10-02, guía de instalación).

| Elemento | Estado en la línea base |
|---|---|
| Historias | HU-01 a HU-06 |
| Roles | juez, secretario, admin |
| Pruebas de aceptación | 22 casos Robot Framework |
| CI | Pipeline con kind (cluster Kubernetes local en el runner) |

> **Supuesto:** el MVP del Sprint 3 no tiene registro en el repositorio ("Dato no disponible"). Se toma la línea base anterior (commits `9b6c2cd` y `faa0e1c`) como equivalente al MVP anterior. **El equipo debe confirmarlo.**

---

## 2. MVP Sprint 5

**Commits del Sprint 5 (2026-10-19):**

| Commit | Mensaje | Qué aporta |
|---|---|---|
| `8e7a716` | test(robot): 50/50 Robot, pytest 40+2xfail, cobertura 93% | Suites Robot para HU-07, HU-08 y HU-09 |
| `801479c` | docs(seguridad) | Informe de seguridad con 28 hallazgos |
| `7002c79` | docs(hu) | Historias de usuario v1.0 |
| `133aaf8` | ci(devops): lint, pytest+cobertura, calidad; endurecer k8s | Pipeline con lint, pytest y cobertura; manifiestos endurecidos |
| `84fe64d` | feat(frontend): filtros, pestaña auditoría, validaciones, vista abogado | Filtros en la bandeja, auditoría por expediente en la interfaz, vista del abogado |
| `06c1638` | feat(auditoria): rol abogado, filtros, auditoría por expediente | Rol `abogado`, filtros del API, endpoint de auditoría por expediente |
| `9265184` | docs(metricas) | Métricas de código y calidad |
| `502358d` | chore(agentes): subagentes del equipo | Subagentes del equipo (sin impacto en el producto) |

### 2.1 Comparación

| Dimensión | MVP anterior (línea base) | MVP Sprint 5 | Cambio |
|---|---|---|---|
| Historias implementadas | HU-01 a HU-06 | HU-01 a HU-09 | **Agregada:** HU-07 (abogado), HU-08 (filtros), HU-09 (auditoría por expediente) |
| Historias postergadas | — | HU-10 (adjuntar PDF con SHA-256) | **Postergada** (rama del equipo; sin estimación) |
| Roles | juez, secretario, admin | juez, secretario, admin, **abogado** | **Agregado** rol abogado con patrocinio |
| Pruebas Robot | 22 | **50** (50/50 pasan) | **Agregado** 28 casos |
| Pruebas pytest | — | 42 (40 pasan, 2 xfail) | **Agregado** |
| Cobertura de sentencias (`app/`) | — | 93 % | **Agregado** |
| CI | Robot con kind | Lint, pytest + cobertura, calidad, Robot contra el cluster | **Agregado** lint, pytest, cobertura y calidad |
| Seguridad | Cabeceras, PBKDF2, JWT, bitácora encadenada | Igual base + informe de 28 hallazgos (todos abiertos) y k8s endurecido | **Priorizado** análisis, sin corregir aún los hallazgos |
| Defectos conocidos | — | DEF-01 (Media), DEF-02 (Alta), ambos abiertos | Registrados con prueba xfail |
| Eliminado | — | **Dato no disponible:** no hay evidencia en el repositorio de funcionalidad eliminada | — |

### 2.2 Qué se priorizó y por qué

| Prioridad | Decisión | Razón (evidencia) |
|---|---|---|
| 1 | Completar HU-07, HU-08 y HU-09 | Son la respuesta directa a la pregunta del cliente: quién hizo qué en cada expediente y cómo priorizar casos (`docs/historias-usuario.md`, sección "Respuesta a la pregunta del cliente"). |
| 2 | Pruebas Robot para cada HU de la sprint | Hasta el MVP anterior, las HU sin prueba de aceptación no tenían evidencia (`docs/metricas.md`). |
| 3 | CI con lint, pytest y cobertura | Mide la calidad en cada push (`133aaf8`). |
| 4 | Endurecer Kubernetes | Pod con `runAsNonRoot`, `readOnlyRootFilesystem` y `drop: ALL` (`133aaf8`, `security/INFORME-SEGURIDAD.md` sección 3). |

### 2.3 Qué se postergó y por qué

| Elemento | Motivo | Fuente |
|---|---|---|
| HU-10: adjuntar PDF con SHA-256 | La trabaja otro equipo en otra rama; no tiene criterios de aceptación en Sprint 5 | `docs/historias-usuario.md` |
| DEF-01: matriz de transiciones de estado (RN-05.5) | Requiere definir la matriz con el PO antes de codificarla | `tests/DEFECTOS.md` |
| Notificación por correo de plazos | Pendiente en el README; el MVP solo muestra alertas en el panel | `README.md` |
| Migraciones con Alembic | Se usa `create_all`; la migración está en "ideas" | `README.md`, R-07.2 |
| Escaneo OpenVAS del staging (SEC-28) | Pendiente de ejecución; no hay resultados de red ni TLS | `security/INFORME-SEGURIDAD.md` |
| Hallazgos de seguridad Alta y Media (SEC-01 a SEC-14) | Todos abiertos; se planean para Sprint 6 | `security/INFORME-SEGURIDAD.md`, sección 8 |

---

## 3. Respuesta a la pregunta del cliente

**Pregunta:** ¿cómo garantiza el sistema la trazabilidad y auditoría de los expedientes judiciales y reduce la congestión?

### 3.1 Trazabilidad y auditoría

| Mecanismo | Evidencia | Prueba que lo comprueba |
|---|---|---|
| **Bitácora con cadena de hashes SHA-256.** Cada registro guarda `hash_anterior` y `hash`; el primero encadena con 64 ceros. El registro se escribe en la misma transacción que el cambio. | `app/audit.py`; RN-03.2 y RN-03.3 en `docs/historias-usuario.md` | `03_auditoria.robot` (3 casos). `GET /api/auditoria/verificar` devuelve `integra: true`. El caso de registro alterado es **prueba manual** (HU-03, criterio 5). |
| **Auditoría por expediente.** `GET /api/expedientes/{id}/auditoria` muestra el historial del expediente a juez, secretario y admin, con usuario, acción, antes, después e IP. | `app/routers/expedientes.py`; `84fe64d`, `06c1638` | `03_auditoria.robot` y la suite de HU-09 (`07_*.robot`, 11 casos). |
| **Registro de cada consulta y cada login.** `CONSULTAR_EXPEDIENTE`, `LOGIN_OK`, `LOGIN_FALLIDO` y `CONSULTA_PUBLICA` quedan en la bitácora. | `docs/historias-usuario.md` (RN-02.5, RN-04.3); `security/INFORME-SEGURIDAD.md` sección 6 | Suites de autenticación y consulta pública. |

**Límite honesto (del informe de seguridad):** la cadena detecta ediciones puntuales, no a un administrador de la base de datos con mala intención. `expediente_id` e `ip` quedan fuera del hash (SEC-09), la cadena no tiene clave (SEC-10) y las escrituras concurrentes pueden bifurcarla (SEC-11). Esto no debe presentarse al cliente como "a prueba de manipulación" sin reservas.

### 3.2 Roles con mínimo privilegio

| Rol | Puede | No puede (verificado) |
|---|---|---|
| Secretario | Crear y editar expedientes; asignar juez y abogado | Cambiar el estado (HU-05, criterio 4); consultar la bitácora (HU-03, criterio 4) |
| Juez | Ver y cambiar el estado solo de sus expedientes | Cambiar o ver expedientes de otro juez (403) (HU-05, criterio 2); crear expedientes (403) (HU-01, criterio 3) |
| Abogado | Ver solo los expedientes que patrocina; registrar escritos | Cambiar estado (403); ver la auditoría (403) (HU-07, criterios 2, 4 y 5) |
| Admin | Consultar la bitácora y su verificación; desbloquear cuentas | Cambiar expedientes (RN-05.1) |

Control de acceso: `security/INFORME-SEGURIDAD.md` sección 4 no encontró IDOR explotable en ningún endpoint. El rol se lee de la base de datos en cada petición (`app/security.py`).

### 3.3 Alertas de plazo

- `GET /api/expedientes/alertas` muestra expedientes con plazo vencido o que vence en 5 días (HU-06, RN-06.1).
- Excluye `con_sentencia` y `archivado` (RN-06.2).
- **Pruebas:** HU-06 tiene 2 casos Robot; el de `07_auditoria_expediente.robot` verifica que se excluyan archivados y con sentencia. Sigue sin probarse el orden.

### 3.4 Consulta ciudadana sin ir al juzgado

- `GET /api/publico/consulta` con número y código de consulta. No requiere login (RN-04.1).
- Responde el mismo 404 si el número no existe o el código es incorrecto (no revela si el expediente existe).
- No expone demandante, demandado ni el detalle de actuaciones (HU-04, criterio 4).
- La página `consulta.html` se publica en `static/`.
- **Limitación:** no hay límite de intentos (SEC-06, SEC-07). El código tiene 32 bits.

### 3.5 Pruebas que lo comprueban

| Tipo | Resultado | Fuente |
|---|---|---|
| Robot Framework (aceptación) | **50 / 50 pasan** (01=7, 02=7, 03=3, 04=5, 05=8, 06=9, 07=11) | `docs/metricas.md` |
| pytest (unitarias) | 42 casos: 40 pasan, 2 xfail (DEF-01 y DEF-02), 0 fallan | `docs/metricas.md`, `tests/DEFECTOS.md` |
| Cobertura de sentencias en `app/` | 93 % (33 de 503 sin cubrir). `admin` 79 %, `expedientes` 86 % | `docs/metricas.md` |

### 3.6 Congestión judicial: lo que el MVP puede y no puede demostrar

- **Sí:** visibiliza y prioriza expedientes (alertas, filtros por estado, materia, juez y plazo) y evita consultas a ventanilla (consulta en línea).
- **No:** el sistema **no mide la congestión por sí mismo**. Faltan métricas como días promedio por etapa o número de expedientes vencidos. Esas métricas no están en el alcance del Sprint 5 (`docs/historias-usuario.md`).

**Respuesta corta para el cliente:** el sistema garantiza trazabilidad por expediente con una bitácora encadenada, auditoría visible por expediente, roles con mínimo privilegio, alertas de plazo y consulta ciudadana en línea, todo con 50 pruebas de aceptación que pasan. No mide la congestión por sí mismo: para demostrar la reducción hacen falta indicadores de tiempo por etapa, que aún no existen. Hay además 2 defectos abiertos (uno de severidad Alta en el radicado) y 28 hallazgos de seguridad abiertos.

---

## 4. Supuestos

| # | Supuesto | Por qué | Confirmar con |
|---|---|---|---|
| S1 | El MVP anterior equivale a los commits `9b6c2cd` y `faa0e1c` (HU-01 a HU-06, 22 Robot, CI con kind). | El MVP del Sprint 3 no tiene registro en el repositorio. | Jonathan Quinto (SM) |
| S2 | HU-07, HU-08 y HU-09 están implementadas en el Sprint 5. | Los commits `06c1638` y `84fe64d` las implementan y los reportes de métricas y seguridad citan sus endpoints. `docs/historias-usuario.md` aún dice "Planificada". | Leonardo Liang (PO) |
| S3 | "Eliminado" se marca como "Dato no disponible". | No hay registro de funcionalidad eliminada. | Equipo |

## 5. Datos no disponibles

- MVP del Sprint 3 (línea base real).
- Funcionalidad eliminada entre MVP anterior y Sprint 5.

## 6. Discrepancias detectadas (para corregir en `historias-usuario.md`, que no es de este agente)

- HU-07, HU-08 y HU-09 aparecen como "Planificada: no existe en el código", pero el código y las pruebas las incluyen.
- HU-08 usa `fecha_desde` y `fecha_hasta`; la API usa `plazo_desde` y `plazo_hasta`. No hay `422` cuando el rango es inválido (DEF-03, candidato, Baja).
- HU-09 indica orden descendente y endpoint `/historial`; la API usa `GET /api/expedientes/{id}/auditoria` en orden ascendente.
- (Resuelto) HU-05 y HU-06 tienen 2 casos Robot cada una, según `results/output.xml`.
