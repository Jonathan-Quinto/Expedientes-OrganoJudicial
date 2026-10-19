# Sprint 1 — Entregables del Product Owner

**Responsable:** Leonardo Liang (Product Owner) · **Sprint:** 19/10 – 25/10/2026 · **Equipo 1**

## 1. Aceptación de historias HU-01 a HU-06

Probado el 19/10/2026 en local (`uvicorn app.main:app --reload`, SQLite) con los usuarios de demo,
en la pantalla y contra la API. Suite automática: **22 tests, 22 passed, 0 failed**.

| HU | Qué se probó | Resultado obtenido | Estado |
|----|--------------|--------------------|--------|
| HU-01 Registrar expediente | `secretario1` registra un expediente con juez y plazo; luego intenta registrar con campos vacíos | Se creó `EXP-2026-000012` con su código de consulta. Con campos vacíos el sistema lo rechaza (422) | ✅ Aceptada |
| HU-02 Login y roles | Entrar con los 4 usuarios; probar acciones de otro rol; 5 claves malas con `juez2` | Cada rol ve lo suyo: el secretario y el juez no entran a la bitácora (403), el juez no puede registrar (403). Tras 5 intentos fallidos `juez2` queda bloqueado ("Cuenta bloqueada. Contacte al administrador") y `admin1` lo puede desbloquear | ✅ Aceptada |
| HU-03 Bitácora | `admin1` revisa la bitácora y verifica integridad | Registra logins (OK y fallidos), creación, consulta y cambio de estado de expedientes, consultas ciudadanas y desbloqueos. Verificación: "Cadena íntegra" (65 registros, ninguno alterado) | ✅ Aceptada |
| HU-04 Consulta ciudadana | `/consulta` con `EXP-2026-000001` + `A1B2C3D4`; luego código incorrecto y expediente inexistente | Muestra número, materia, estado, fecha y última actuación, **sin nombres de las partes**. Código malo y expediente inexistente dan el mismo mensaje: "Número o código de consulta incorrecto" | ✅ Aceptada |
| HU-05 Juez decide | `juez1` cambia el estado con motivo; `juez2` intenta ver y cambiar el mismo expediente | `juez1` lo pasa a "En trámite" y queda la actuación con el motivo. Motivo vacío se rechaza. `juez2` no lo ve en su lista ni puede abrirlo o cambiarlo (403) | ✅ Aceptada |
| HU-06 Alertas de plazo | `secretario1` revisa la tarjeta "Plazos por vencer" | Muestra 3: el nuevo (vence 22/10) y `EXP-2026-000001` (21/10) como "vence pronto", y `EXP-2026-000003` (18/10) como "vencido". `EXP-2026-000002` (08/11) no sale marcado | ✅ Aceptada |

**Observación (no bloquea la aceptación):** las pruebas de Robot dejan expedientes "Robot Demandante vs.
Robot Demandado" en la base de la demo (`EXP-2026-000004` a `000011`). Antes de la Review hay que reiniciar
la base (detener el servidor, borrar `expedientes.db` y arrancarlo) para que la demo se vea limpia.

## 2. Prioridad del próximo sprint

Los documentos PDF son el trabajo de **este** sprint (Javier, Daniela y Edwin). Si el domingo no se aceptan,
pasan primero al siguiente sprint. Si se aceptan, el orden para el Sprint 2 es:

1. **Migraciones con Alembic.** La tabla de documentos ya obliga a cambiar la base, y hoy la única forma es
   borrarla. Eso destruye los expedientes y la bitácora, que es la evidencia legal del sistema. Sin esto no
   podemos actualizar nada en producción.
2. **Aviso de plazos por correo.** Es lo que más valor da al usuario: hoy la alerta solo existe si alguien
   entra a mirar la pantalla, y un plazo vencido en un proceso judicial tiene consecuencias.
3. **Adjuntar documentos PDF.** Solo si no se acepta el domingo; en ese caso sube al primer lugar.

### Historia de usuario (prioridad 1)

> **Como** Administrador del sistema **quiero** que los cambios en la base de datos se apliquen con
> migraciones versionadas **para** actualizar el sistema sin perder expedientes ni la bitácora.
>
> **Criterios de aceptación:**
> - `alembic upgrade head` crea la base desde cero, tanto en SQLite como en PostgreSQL (`docker compose`).
> - La primera migración reproduce el esquema actual; aplicarla sobre una base existente no borra datos.
> - La tabla de documentos se agrega con una migración, sin borrar `expedientes.db`.
> - Después de migrar, "Verificar integridad" de la bitácora sigue diciendo "Cadena íntegra".
> - Cada migración se puede revertir con `alembic downgrade -1`.
> - El pipeline de Actions aplica las migraciones antes de correr las pruebas.
> - SETUP.md explica cómo aplicar una migración.

## 3. Guion de la Sprint Review (domingo 25/10, 15 min)

**Antes de empezar:** reiniciar la base de la demo, tener el servidor arriba y una pestaña con
`results/report.html` y otra con Actions en GitHub.

| # | Quién | Tiempo | Qué muestra |
|---|-------|--------|-------------|
| 1 | Leonardo | 1 min | Objetivo del sprint: el expediente pasa de papel a digital con evidencia verificable. Recordar que HU-01 a HU-06 ya están aceptadas |
| 2 | Javier | 3 min | Subir un PDF a un expediente, descargarlo y ver la huella SHA-256 y el registro en la bitácora (desde `/docs`) |
| 3 | Daniela | 3 min | Sección "Documentos" en el detalle del expediente y la vista en celular |
| 4 | Edwin | 2 min | Suite en verde (28 passed esperados) y la pestaña Actions |
| 5 | Leonardo | 3 min | Acepto o rechazo la historia de documentos con sus criterios y anuncio la prioridad del Sprint 2 |
| 6 | Jonathan | 3 min | Retrospectiva: qué salió bien, qué mejorar, un compromiso para el siguiente sprint |

**Criterios para aceptar la historia de documentos el domingo:** solo PDF de máximo 10 MB; cada archivo
guarda su SHA-256; subida y descarga quedan en la bitácora; un juez no ve documentos de expedientes de otro
juez; las pruebas de `05_documentos.robot` pasan.

## Checklist

- [x] Proyecto corriendo en mi compu (22/22 pruebas)
- [x] Tabla HU-01 a HU-06 llena
- [ ] Tabla enviada al grupo
- [x] Backlog del próximo sprint ordenado, con la historia nueva escrita
- [ ] Review del domingo dirigida
