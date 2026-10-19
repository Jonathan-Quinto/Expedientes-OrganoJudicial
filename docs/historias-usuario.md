# Historias de usuario: Expediente Judicial Digital (MVP)

**Equipo 1 · Ingeniería de Software III · Caso 1: Congestión Judicial (Órgano Judicial de Panamá)**
**Sprint 5 · Versión 1.0 · 19/10/2026**

Fuentes: `README.md` (backlog PB-01 a PB-07), `app/routers/*.py` (auth, expedientes, publico, admin), `app/security.py`, `app/audit.py`, `app/models.py` y `tests/robot/*.robot`.

**Equipo:** Leonardo Liang (PO) · Jonathan Quinto (SM) · Javier Pravia (Backend) · Daniela Anaya (Frontend) · Edwin Cisneros (QA)

---

## 0. Resumen del backlog

| HU | Título | Estado | Prioridad | Puntos (propuesta) | Responsable | Apoyo |
|---|---|---|---|---|---|---|
| HU-01 | Registro del expediente digital | Implementada | Alta | 5 | Javier Pravia | Daniela Anaya |
| HU-02 | Login y control de roles | Implementada | Alta | 3 | Javier Pravia | Daniela Anaya |
| HU-03 | Consulta de bitácora e integridad | Implementada | Alta | 3 | Javier Pravia | Daniela Anaya |
| HU-04 | Consulta pública del ciudadano | Implementada | Alta | 3 | Daniela Anaya | Javier Pravia |
| HU-05 | Juez gestiona el estado del expediente | Implementada | Alta | 3 | Javier Pravia | Daniela Anaya |
| HU-06 | Alertas de plazo | Implementada | Alta | 2 | Daniela Anaya | Javier Pravia |
| HU-07 | Abogado consulta sus expedientes y registra escritos | Implementada – Sprint 5 | Alta | 5 | Javier Pravia | Daniela Anaya |
| HU-08 | Bandeja con filtros | Implementada – Sprint 5 | Media | 3 | Daniela Anaya | Javier Pravia |
| HU-09 | Historial de auditoría en el detalle del expediente | Implementada – Sprint 5 | Media | 3 | Daniela Anaya | Javier Pravia |
| HU-10 | Adjuntar documentos PDF con hash SHA-256 | Postergada / en rama del equipo | Baja | No estimada | Equipo humano (otra rama) | — |

Responsables transversales: **Leonardo Liang (PO)** acepta cada HU · **Jonathan Quinto (SM)** facilita el refinamiento · **Edwin Cisneros (QA)** define y ejecuta las pruebas Robot de cada HU.

Puntos: propuesta de este documento; se confirman en el planning del Sprint 5.

### Convenciones

- **Implementada:** existe en `app/` y tiene (o debe tener) prueba en `tests/robot/`.
- **Planificada:** no existe en el código. Los criterios de aceptación son el objetivo, no un comportamiento actual.
- **Postergada:** fuera del Sprint 5.
- Los códigos de error son los reales del API (401, 403, 404, 422, 423).

---

## HU-01: Registro del expediente digital

**Estado:** Implementada · **Backlog:** PB-01 · **Prioridad:** Alta · **Puntos:** 5 · **Responsable:** Javier Pravia (Backend), apoyo Daniela Anaya (formulario)

**Historia**
- **Como** secretario,
- **quiero** registrar un expediente digital con materia, demandante, demandado, descripción y juez asignado,
- **para** que el caso quede radicado con un número único, un código de consulta para el ciudadano y una actuación de radicación.

**Criterios de aceptación**

1. **Dado** que estoy autenticado como `secretario1`, **cuando** envío `POST /api/expedientes` con materia, demandante y demandado válidos, **entonces** recibo `201` con:
   - `numero` con formato `EXP-AAAA-NNNNNN`,
   - `codigo_consulta` de 8 caracteres,
   - `estado` = `radicado`,
   - una primera actuación de tipo `radicacion`.
2. **Dado** que envío datos inválidos (materia de 1 carácter o demandante vacío), **cuando** hago el `POST`, **entonces** recibo `422` y no se crea ningún expediente.
3. **Dado** que estoy autenticado como `juez1`, **cuando** hago `POST /api/expedientes`, **entonces** recibo `403` (negativo de rol).
4. **Dado** que indico un `juez_id` que no corresponde a un usuario con rol juez, **cuando** hago el `POST`, **entonces** recibo `422` con "juez_id no corresponde a un juez".
5. **Dado** que se radica un expediente, **cuando** consulto la bitácora, **entonces** existe un registro `CREAR_EXPEDIENTE` con `despues` (número, estado, juez, fecha límite).

**Reglas de negocio**
- RN-01.1: el número sigue `EXP-AAAA-NNNNNN`, donde AAAA es el año de radicación y NNNNNN es el consecutivo. Hoy el consecutivo es `total de expedientes + 1` (global, no se reinicia por año).
- RN-01.2: el código de consulta tiene 8 caracteres hexadecimales en mayúsculas. Solo se muestra al crear el expediente; el secretario lo entrega al ciudadano.
- RN-01.3: el estado inicial es `radicado`.
- RN-01.4: el juez asignado es opcional al crear, pero si se indica debe tener rol juez.
- RN-01.5: materia entre 3 y 60 caracteres; demandante y demandado entre 3 y 160.
- RN-01.6: solo el secretario crea y edita expedientes (`PATCH /api/expedientes/{id}`).

**Riesgos**

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-01.1 | El número se calcula con `count + 1`. Si se borran registros o hay dos radicaciones simultáneas, se genera un número duplicado y falla la restricción única (error 500). | Media | Alta | Secuencia en base de datos o reintento ante conflicto. Decisión para Javier. |
| R-01.2 | `PATCH` no valida que `juez_id` sea un juez (sí lo valida el `POST`). Un secretario podría asignar un expediente a un usuario que no es juez. | Media | Media | Replicar la validación de `crear` en `editar`. Hallazgo del análisis de código. |
| R-01.3 | El consecutivo no reinicia por año (ej. EXP-2027-000013), lo que puede confundir al ciudadano. | Alta | Baja | Confirmar con el PO si es aceptable. |

---

## HU-02: Login y control de roles

**Estado:** Implementada · **Backlog:** PB-02 · **Prioridad:** Alta · **Puntos:** 3 · **Responsable:** Javier Pravia (Backend), apoyo Daniela Anaya

**Historia**
- **Como** usuario del sistema (secretario, juez o admin),
- **quiero** iniciar sesión y que el sistema me deje solo las acciones de mi rol,
- **para** que cada persona acceda únicamente a lo que le corresponde y la fuerza bruta no comprometa las cuentas.

**Criterios de aceptación**

1. **Dado** que tengo credenciales correctas, **cuando** hago `POST /api/auth/login`, **entonces** recibo `200` con `access_token`, `rol` y `nombre`.
2. **Dado** que la contraseña es incorrecta, **cuando** hago login, **entonces** recibo `401` con "Usuario o contraseña incorrectos" (el mismo mensaje si el usuario no existe).
3. **Dado** que llamo un endpoint protegido sin token, **cuando** hago `GET /api/expedientes`, **entonces** recibo `401` "Falta token".
4. **Dado** que el token fue alterado, **cuando** lo envío, **entonces** recibo `401` "Token inválido o expirado" (negativo de firma).
5. **Dado** que estoy autenticado como `juez1`, **cuando** intento `POST /api/expedientes` (acción de secretario), **entonces** recibo `403`.
6. **Dado** que fallo cinco veces seguidas con la misma cuenta, **cuando** intento entrar, **entonces** la cuenta queda bloqueada y el login con la contraseña correcta responde `423` "Cuenta bloqueada".

**Reglas de negocio**
- RN-02.1: las contraseñas se guardan con PBKDF2-SHA256 y 310.000 iteraciones.
- RN-02.2: al crear un usuario, la contraseña debe tener al menos 10 caracteres.
- RN-02.3: el token JWT expira según `JWT_EXPIRE_MINUTES`.
- RN-02.4: el bloqueo ocurre al quinto intento fallido (`MAX_INTENTOS = 5`). Solo el admin desbloquea con `POST /api/usuarios/{id}/desbloquear`.
- RN-02.5: cada login exitoso o fallido queda en la bitácora (`LOGIN_OK`, `LOGIN_FALLIDO`).
- RN-02.6: los roles son `juez`, `secretario` y `admin`.

**Riesgos**

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-02.1 | Un atacante bloquea deliberadamente la cuenta de otro usuario (denegación de servicio). | Media | Media | Desbloqueo por admin; evaluar bloqueo temporal en lugar de permanente. |
| R-02.2 | El `423` revela que la cuenta existe y está bloqueada. | Baja | Baja | Aceptado para el MVP; revisar con el PO. |

---

## HU-03: Consulta de bitácora e integridad

**Estado:** Implementada · **Backlog:** PB-03 · **Prioridad:** Alta · **Puntos:** 3 · **Responsable:** Javier Pravia (Backend), apoyo Daniela Anaya

**Historia**
- **Como** administrador,
- **quiero** consultar la bitácora con usuario, fecha, IP y valores antes/después, y verificar que no fue alterada,
- **para** demostrar quién hizo qué y cuándo, y detectar manipulación.

**Criterios de aceptación**

1. **Dado** que `juez1` cambió el estado de un expediente, **cuando** `admin1` consulta `GET /api/auditoria?entidad=expediente&entidad_id={id}`, **entonces** el primer registro tiene `accion` = `CAMBIAR_ESTADO`, `usuario` = `juez1`, `antes` con el estado previo, `despues` con el nuevo, `ip` y `fecha`.
2. **Dado** que hubo un login fallido, **cuando** el admin consulta la bitácora, **entonces** aparece `LOGIN_FALLIDO`.
3. **Dado** que la cadena no fue alterada, **cuando** el admin hace `GET /api/auditoria/verificar`, **entonces** recibo `integra: true` y el número de registros.
4. **Dado** que estoy autenticado como `secretario1`, **cuando** hago `GET /api/auditoria`, **entonces** recibo `403` (negativo de rol).
5. **Dado** que un registro fue modificado directamente en la base de datos, **cuando** el admin verifica, **entonces** recibo `integra: false` con `roto_en_id` igual al registro alterado. *Sin prueba Robot automatizada: prueba manual de QA.*

**Reglas de negocio**
- RN-03.1: solo el admin consulta la bitácora y su verificación.
- RN-03.2: cada registro guarda `hash_anterior` y `hash` (SHA-256). El primer registro encadena con 64 ceros.
- RN-03.3: el registro de auditoría se escribe en la misma transacción que el cambio. Si el cambio falla, no queda registro huérfano.
- RN-03.4: la consulta devuelve como máximo 1.000 registros (por defecto, 200).
- RN-03.5: el sistema no ofrece endpoints para editar ni borrar registros de la bitácora.

**Riesgos**

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-03.1 | Quien tenga acceso directo a la base de datos puede borrar la tabla completa; la cadena detecta alteraciones, pero no un borrado total. | Baja | Alta | Permisos de BD restringidos y copias externas (fuera del MVP). |
| R-03.2 | La verificación recorre toda la tabla y crece con el uso. | Media | Media | Medir tiempos al crecer la bitácora; paginar o verificar por rangos. |

---

## HU-04: Consulta pública del ciudadano

**Estado:** Implementada · **Backlog:** PB-05 (cabeceras de seguridad: PB-04) · **Prioridad:** Alta · **Puntos:** 3 · **Responsable:** Daniela Anaya (página `consulta.html`), apoyo Javier Pravia (endpoint)

**Historia**
- **Como** ciudadano,
- **quiero** consultar el estado de mi proceso con el número de expediente y el código que me entregó el secretario,
- **para** saber en qué etapa está sin ir a la ventanilla.

**Criterios de aceptación**

1. **Dado** que tengo el número y el código correctos, **cuando** hago `GET /api/publico/consulta?numero=…&codigo=…`, **entonces** recibo `200` con `numero`, `materia`, `estado`, `actualizado_en` y `ultima_actuacion` (solo el tipo).
2. **Dado** que el código es incorrecto, **cuando** consulto, **entonces** recibo `404` "Número o código de consulta incorrecto".
3. **Dado** que el número no existe, **cuando** consulto, **entonces** recibo el mismo `404` y mensaje que en el criterio 2 (no revela si el expediente existe).
4. **Dado** que la consulta es exitosa, **cuando** reviso la respuesta, **entonces** no contiene `demandante`, `demandado` ni el detalle de las actuaciones.
5. **Dado** que la consulta falla, **cuando** consulto la bitácora, **entonces** existe un registro `CONSULTA_PUBLICA_FALLIDA`.

**Reglas de negocio**
- RN-04.1: la consulta no requiere login.
- RN-04.2: el código se compara con `hmac.compare_digest` (comparación de tiempo constante) y no distingue mayúsculas ni espacios laterales.
- RN-04.3: la consulta exitosa se registra como `CONSULTA_PUBLICA`.
- RN-04.4: las cabeceras de seguridad (`nosniff`, `X-Frame-Options: DENY`, CSP, HSTS) van en todas las respuestas (PB-04).

**Riesgos**

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-04.1 | Fuerza bruta del código de 8 hexadecimales (unas 4.300 millones de combinaciones) sin límite de intentos en el endpoint. | Media | Media | Los fallos quedan en bitácora (detectable). Evaluar límite de intentos por IP como trabajo futuro. |
| R-04.2 | La página `consulta.html` muestra el número en la URL o en el historial del navegador. | Baja | Baja | Revisar con Daniela. |

---

## HU-05: El juez gestiona el estado del expediente

**Estado:** Implementada · **Backlog:** PB-01 (con trazabilidad de PB-03) · **Prioridad:** Alta · **Puntos:** 3 · **Responsable:** Javier Pravia (Backend), apoyo Daniela Anaya

**Historia**
- **Como** juez,
- **quiero** ver solo los expedientes que tengo asignados y cambiar su estado con un motivo,
- **para** registrar mis decisiones y que queden como actuación y en la auditoría.

**Criterios de aceptación**

1. **Dado** que `juez1` tiene asignado un expediente en `radicado`, **cuando** hace `POST /api/expedientes/{id}/estado` con `estado` = `en_tramite` y `motivo` = "Admitida la demanda", **entonces** recibo `200`, el estado cambia, se crea una actuación `cambio_estado` con el texto "radicado -> en_tramite: Admitida la demanda" y se escribe `CAMBIAR_ESTADO` en la bitácora.
2. **Dado** que el expediente está asignado a `juez2`, **cuando** `juez1` intenta cambiar su estado o consultarlo, **entonces** recibo `403` (negativo de propiedad).
3. **Dado** que el motivo tiene menos de 5 caracteres, **cuando** envío el cambio, **entonces** recibo `422` y el estado no cambia.
4. **Dado** que estoy autenticado como `secretario1`, **cuando** intento cambiar el estado, **entonces** recibo `403`.

**Reglas de negocio**
- RN-05.1: solo el juez asignado al expediente cambia su estado. El admin consulta, pero no cambia expedientes.
- RN-05.2: el motivo es obligatorio, de 5 a 1.000 caracteres.
- RN-05.3: el estado debe ser uno de: `radicado`, `en_tramite`, `en_audiencia`, `con_sentencia`, `archivado`.
- RN-05.4: el cambio, la actuación y la auditoría se guardan en la misma transacción.
- RN-05.5 (**no implementada**): hoy se puede pasar de cualquier estado a cualquier otro (por ejemplo, de `archivado` a `radicado`). La matriz de transiciones válidas está pendiente de definir con el PO.

**Riesgos**

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-05.1 | Transiciones inválidas de estado (ej. reabrir un expediente archivado sin control). | Media | Media | Definir la matriz de transiciones con el PO y validarla en el backend. |
| R-05.2 | Un expediente sin juez asignado no lo gestiona ningún juez y el admin no lo modifica. | Media | Media | Asignación obligatoria antes de la primera actuación, o permitir al secretario reasignar. |

---

## HU-06: Alertas de plazo

**Estado:** Implementada · **Backlog:** PB-06 · **Prioridad:** Alta · **Puntos:** 2 · **Responsable:** Daniela Anaya (panel), apoyo Javier Pravia (endpoint)

**Historia**
- **Como** secretario o juez,
- **quiero** ver los expedientes con plazo vencido o que vence en los próximos 5 días,
- **para** atenderlos antes de que se generen retrasos.

**Criterios de aceptación**

1. **Dado** un expediente en `en_tramite` con `fecha_limite` dentro de 3 días, **cuando** el secretario hace `GET /api/expedientes/alertas`, **entonces** el expediente aparece.
2. **Dado** un expediente con `fecha_limite` de ayer, **cuando** consulto las alertas, **entonces** aparece (plazo vencido).
3. **Dado** un expediente `archivado` o `con_sentencia` con plazo vencido, **cuando** consulto las alertas, **entonces** **no** aparece (negativo de exclusión).
4. **Dado** un expediente sin `fecha_limite`, **cuando** consulto las alertas, **entonces** no aparece.
5. **Dado** que `juez1` consulta, **cuando** recibe la lista, **entonces** solo incluye sus expedientes.

**Reglas de negocio**
- RN-06.1: la ventana por defecto es `ALERTA_DIAS` = 5 días (variable de entorno). El parámetro `dias` puede cambiarla en la consulta.
- RN-06.2: se excluyen los estados `con_sentencia` y `archivado`.
- RN-06.3: la lista se ordena por `fecha_limite` ascendente.
- RN-06.4: las alertas se muestran en el panel. No hay notificación por correo (pendiente, según README).

**Riesgos**

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-06.1 | La prueba Robot solo verifica que la lista no esté vacía; no prueba exclusiones ni el orden. | Alta | Media | Edwin amplía `02_expedientes.robot` con los criterios 3 y 5. |
| R-06.2 | El parámetro `dias` acepta cualquier entero (incluso negativos o muy grandes) sin validación. | Media | Baja | Limitar el rango en el endpoint. |

---

## HU-07: Abogado consulta sus expedientes y registra escritos

**Estado:** Implementada – Sprint 5 (rol `abogado`, `Expediente.abogado_id`, `GET /api/abogados`) · **Backlog:** PB-01 (extensión) · **Prioridad:** Alta · **Puntos:** 5 · **Responsable:** Javier Pravia (Backend), apoyo Daniela Anaya

**Historia**
- **Como** abogado,
- **quiero** consultar solo los expedientes que patrocino y registrar mis escritos como actuaciones,
- **para** dar seguimiento a mis casos sin ver expedientes ajenos ni la auditoría del sistema.

**Criterios de aceptación**

1. **Dado** que `abogado1` patrocina dos expedientes, **cuando** hace `GET /api/expedientes`, **entonces** recibe solo esos dos.
2. **Dado** que `abogado1` no patrocina el expediente `{id}`, **cuando** hace `GET /api/expedientes/{id}`, **entonces** recibe `403`.
3. **Dado** que `abogado1` patrocina el expediente, **cuando** hace `POST /api/expedientes/{id}/actuaciones` con `tipo` = `escrito`, **entonces** recibe `201` y se registra `AGREGAR_ACTUACION` en la bitácora.
4. **Dado** que `abogado1` intenta cambiar el estado, **cuando** hace `POST /api/expedientes/{id}/estado`, **entonces** recibe `403`.
5. **Dado** que `abogado1` consulta la bitácora, **cuando** hace `GET /api/auditoria`, **entonces** recibe `403`.

**Reglas de negocio**
- RN-07.1: se crea el rol `abogado`. Hoy `Rol` solo tiene `juez`, `secretario` y `admin` (`app/models.py`).
- RN-07.2: se crea la relación de patrocinio entre expediente y abogado. Hoy `Expediente` no tiene este campo.
- RN-07.3 (**supuesto a validar con el PO**): el secretario asigna el abogado patrocinador.
- RN-07.4: el abogado no cambia estado ni ve la auditoría.

**Riesgos**

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-07.1 | Un patrocinio mal asignado da acceso a un expediente ajeno. | Media | Alta | Doble verificación en la asignación y prueba negativa (criterio 2). |
| R-07.2 | Cambios en el modelo de datos sin migración (el MVP usa `create_all`). | Alta | Media | Coordinar con Javier; la migración con Alembic está en "ideas". |

---

## HU-08: Bandeja con filtros

**Estado:** Implementada – Sprint 5 (`GET /api/expedientes` con `q`, `estado`, `materia`, `juez_id`, `plazo_desde`, `plazo_hasta`) · **Backlog:** PB-01 (extensión) · **Prioridad:** Media · **Puntos:** 3 · **Responsable:** Daniela Anaya (interfaz), apoyo Javier Pravia (filtros)

**Historia**
- **Como** secretario o admin,
- **quiero** filtrar la bandeja de expedientes por estado, materia, juez y rango de plazo,
- **para** identificar rápidamente qué casos requieren atención.

**Criterios de aceptación**

1. **Dado** que hay expedientes en varios estados, **cuando** filtro por `estado` = `en_tramite`, **entonces** la lista solo incluye expedientes `en_tramite`.
2. **Dado** que filtro por `materia` = `civil`, **cuando** consulto, **entonces** solo aparecen expedientes de materia civil.
3. **Dado** que filtro por `juez_id`, **cuando** consulto, **entonces** solo aparecen los expedientes de ese juez.
4. **Dado** que filtro por rango de plazo (`plazo_desde` a `plazo_hasta`), **cuando** consulto, **entonces** solo aparecen los expedientes con `fecha_limite` dentro del rango; los que no tienen `fecha_limite` quedan fuera.
5. **Dado** que `juez1` aplica el filtro `juez_id` = de `juez2`, **cuando** consulta, **entonces** la lista no incluye expedientes de `juez2` (un juez siempre ve solo los suyos).
6. **Dado** que `plazo_desde` es posterior a `plazo_hasta`, **cuando** consulto, **entonces** recibo `422`. *(Pendiente: hoy la API devuelve lista vacía; la pantalla sí lo valida. Observación DEF-03 candidata, por confirmar con el PO.)*

**Reglas de negocio**
- RN-08.1: los filtros se combinan con AND.
- RN-08.2: la materia se compara por coincidencia exacta (supuesto a confirmar con el PO).
- RN-08.3: el juez siempre queda limitado a sus expedientes, aunque pida otro `juez_id`.
- RN-08.4: el orden por defecto es por `fecha_limite` ascendente.

**Riesgos**

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-08.1 | Sin índices, filtrar por materia y plazo se vuelve lento con muchos expedientes. | Baja | Media | Agregar índices en `materia` y `fecha_limite`. |
| R-08.2 | Materias escritas con variaciones ("Civil", "civil ") no coinciden. | Media | Baja | Catálogo cerrado de materias. |

---

## HU-09: Historial de auditoría en el detalle del expediente

**Estado:** Implementada – Sprint 5 (`GET /api/expedientes/{id}/auditoria` y pestaña Auditoría en el detalle) · **Backlog:** PB-03 · **Prioridad:** Media · **Puntos:** 3 · **Responsable:** Daniela Anaya (vista), apoyo Javier Pravia (endpoint)

**Historia**
- **Como** admin, secretario o juez dueño del expediente,
- **quiero** ver el historial de cambios del expediente dentro de su detalle,
- **para** saber quién hizo cada cambio sin salir de la pantalla del caso.

**Criterios de aceptación**

1. **Dado** que se cambió el estado de un expediente, **cuando** el admin abre su detalle, **entonces** ve el registro con usuario, fecha, acción, antes, después e IP.
2. **Dado** que `juez1` es dueño del expediente, **cuando** abre su detalle, **entonces** ve el mismo historial.
3. **Dado** que `juez2` no es dueño del expediente, **cuando** intenta ver el historial, **entonces** recibe `403`.
4. **Dado** que estoy autenticado como `abogado1`, **cuando** abro el detalle, **entonces** el historial no se muestra (negativo de rol).
5. **Dado** que el expediente tiene varios cambios, **cuando** veo el historial, **entonces** aparecen en orden cronológico (del más antiguo al más reciente), igual que la cadena de hashes.

**Reglas de negocio**
- RN-09.1: el historial incluye los registros cuyo `entidad` = `expediente` y `entidad_id` = id del expediente.
- RN-09.2 (**decisión pendiente con el PO**): ¿las consultas (`CONSULTAR_EXPEDIENTE`) se muestran en el historial o solo los cambios?
- RN-09.3 (**supuesto**): la IP solo la ve el admin.
- RN-09.4: el endpoint es `GET /api/expedientes/{id}/auditoria` (admin, secretario y juez dueño; el abogado recibe 403).

**Riesgos**

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-09.1 | Mostrar la IP a jueces o secretarios expone datos innecesarios. | Baja | Media | Ocultar la IP fuera del rol admin (RN-09.3). |
| R-09.2 | Las consultas registradas inflan el historial y dificultan leerlo. | Media | Baja | Decisión de RN-09.2. |

---

## HU-10: Adjuntar documentos PDF con hash SHA-256

**Estado:** Postergada / en rama del equipo · **Backlog:** sin ítem PB (README, "Pendiente para próximos sprints") · **Prioridad:** Baja · **Puntos:** No estimada · **Responsable:** equipo humano (otra rama)

**Historia**
- **Como** secretario,
- **quiero** adjuntar documentos PDF a un expediente, con un hash SHA-256 por archivo,
- **para** garantizar que el documento no fue alterado después de subirlo.

**Nota:** la trabaja el equipo humano en otra rama. Este documento no define criterios de aceptación para el Sprint 5. Cuando se retome, se redactarán Given/When/Then.

---

## Matriz de trazabilidad

| HU | PB | Archivo / endpoint | Prueba Robot (archivo · tag) | Estado |
|---|---|---|---|---|
| HU-01 | PB-01 | `app/routers/expedientes.py` · `POST /api/expedientes`, `GET /api/expedientes/{id}`, `PATCH /api/expedientes/{id}` | `02_expedientes.robot` · PB-01 (el `PATCH` no tiene prueba) | Implementada |
| HU-02 | PB-02 | `app/security.py`, `app/routers/auth.py` · `POST /api/auth/login`, `GET /api/auth/me`; `app/routers/admin.py` · `POST /api/usuarios/{id}/desbloquear` | `01_autenticacion.robot` · PB-02 | Implementada |
| HU-03 | PB-03 | `app/audit.py`, `app/routers/admin.py` · `GET /api/auditoria`, `GET /api/auditoria/verificar` | `03_auditoria.robot` · PB-03 (criterio 5 sin prueba) | Implementada |
| HU-04 | PB-05 (PB-04 en cabeceras) | `app/routers/publico.py` · `GET /api/publico/consulta`; `static/consulta.*` | `04_consulta_publica.robot` · PB-05 | Implementada |
| HU-05 | PB-01 y PB-03 | `app/routers/expedientes.py` · `POST /api/expedientes/{id}/estado` | `02_expedientes.robot` · PB-01; `03_auditoria.robot` · PB-03 | Implementada |
| HU-06 | PB-06 | `app/routers/expedientes.py` · `GET /api/expedientes/alertas` | `02_expedientes.robot` · PB-06 (prueba débil, ver R-06.1) | Implementada |
| HU-07 | PB-01 (extensión) | `app/models.py` (`Rol.abogado`, `abogado_id`), `app/routers/expedientes.py` · `_obtener`, `GET /api/abogados` | `05_abogado.robot` · HU-07 | Implementada – Sprint 5 |
| HU-08 | PB-01 (extensión) | `app/routers/expedientes.py` · `GET /api/expedientes` (q, estado, materia, juez_id, plazo_desde, plazo_hasta) | `06_filtros.robot` · HU-08 | Implementada – Sprint 5 |
| HU-09 | PB-03 | `app/routers/expedientes.py` · `GET /api/expedientes/{id}/auditoria`; `app/audit.py` (`expediente_id`) | `07_auditoria_expediente.robot` · HU-09 | Implementada – Sprint 5 |
| HU-10 | Sin PB | Sin archivo | Sin prueba | Postergada / en rama del equipo |

---

## Respuesta a la pregunta del cliente

**Pregunta:** ¿cómo garantiza el sistema trazabilidad y auditoría, y reduce la congestión judicial?

**Trazabilidad y auditoría**
- **HU-01 y HU-05:** cada radicación y cada cambio de estado deja una actuación y un registro de auditoría con antes y después, en la misma transacción.
- **HU-02:** cada login, exitoso o fallido, queda registrado. El bloqueo a los 5 intentos limita la fuerza bruta.
- **HU-03:** la bitácora está encadenada con SHA-256. Si alguien altera un registro en la base de datos, `verificar` lo detecta y señala el punto de ruptura.
- **HU-09:** el historial aparece en el propio expediente, para que el juez, el secretario y el admin vean quién hizo cada cambio.

**Reducción de la congestión**
- **HU-06:** muestra los expedientes con plazo vencido o próximo a vencer, para atenderlos antes de que se atrasen.
- **HU-08:** la bandeja filtrada permite priorizar por estado, materia, juez y plazo, en vez de revisar expedientes uno por uno.
- **HU-04:** el ciudadano consulta el estado en línea, lo que reduce las visitas a ventanilla para preguntar por el avance.
- **HU-05 y HU-07:** cada juez ve solo sus casos, y el abogado registra escritos sin depender del secretario.

**Límite de la respuesta:** el sistema **no mide la congestión por sí mismo**. Las HU ayudan a visibilizar y priorizar los casos, pero el impacto real debe demostrarse con métricas (por ejemplo, días promedio por etapa o número de expedientes vencidos). Esas métricas no están en el alcance del Sprint 5.

---

## Métricas QA por HU

Resultados reales de la ejecución del 2026-10-19 (`robot tests/robot` sobre base nueva: 50 ejecutados, 50 pasados). La asignación de cada caso a una HU se hizo por el contenido de la prueba. Los defectos vienen de `tests/DEFECTOS.md`; pytest (42 casos, 40 pasados y 2 xfail) no se desglosa por HU.

| HU | Casos Robot | Pasados | Fallados | Defectos abiertos |
|---|---|---|---|---|
| HU-01 | 7 (02: 4 · 07: 3 de PATCH) | 7 | 0 | DEF-02 (Alta) |
| HU-02 | 7 (01) | 7 | 0 | — |
| HU-03 | 4 (03: 3 · 07: 1 de integridad) | 4 | 0 | — |
| HU-04 | 5 (04) | 5 | 0 | — |
| HU-05 | 2 (02) | 2 | 0 | DEF-01 (Media) |
| HU-06 | 2 (02: 1 · 07: 1) | 2 | 0 | — |
| HU-07 | 8 (05) | 8 | 0 | — |
| HU-08 | 9 (06) | 9 | 0 | Observación DEF-03 (candidata, Baja) |
| HU-09 | 6 (07) | 6 | 0 | — |
| HU-10 | 0 (postergada) | — | — | — |
| **Total** | **50** | **50** | **0** | **2 abiertos + 1 candidato** |
