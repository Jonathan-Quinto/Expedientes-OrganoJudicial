# Registro de defectos (QA)

Fecha de deteccion: 2026-10-19 · Rama `sprint5` · Detectados con pytest (`tests/unit/test_api.py`, marcados `xfail strict`: cuando se corrijan, la prueba pasara a XPASS y fallara hasta quitar el marcador).

## DEF-01 — No hay validacion de transiciones de estado
- **HU:** HU-05 (RN-05.5, ya reconocida como no implementada)
- **Severidad:** Media
- **Estado:** Abierto
- **Pasos:** (1) secretario1 crea un expediente asignado a juez1. (2) juez1 hace `POST /api/expedientes/{id}/estado` con `archivado`. (3) juez1 hace el mismo POST con `radicado`.
- **Esperado:** el paso 3 se rechaza (409/422): un expediente archivado no vuelve a `radicado`.
- **Obtenido:** `200 OK`; el estado vuelve a `radicado` y queda auditado como cambio normal.
- **Prueba:** `tests/unit/test_api.py::test_def01_no_se_puede_reabrir_un_archivado_a_radicado`
- **Origen:** `app/routers/expedientes.py::cambiar_estado` (asigna `datos.estado` sin matriz de transiciones).

## DEF-02 — Numero EXP calculado con `count()+1` puede duplicarse
- **HU:** HU-01
- **Severidad:** Alta (error 500 al radicar; con concurrencia, el mismo riesgo)
- **Estado:** Abierto
- **Pasos:** (1) crear dos expedientes. (2) eliminar el primero (hueco en la numeracion, p. ej. limpieza por DBA). (3) `POST /api/expedientes` como secretario1.
- **Esperado:** `201` con un numero nuevo y unico.
- **Obtenido:** `500 Internal Server Error`: `_siguiente_numero` devuelve `count()+1`, que coincide con el numero del ultimo expediente existente y viola el `UNIQUE` de `expedientes.numero`. Dos peticiones simultaneas tambien calculan el mismo `count()+1`.
- **Prueba:** `tests/unit/test_api.py::test_def02_numero_no_se_duplica_si_hay_huecos`
- **Origen:** `app/routers/expedientes.py::_siguiente_numero`. Sugerencia: secuencia/`MAX(id)` o reintento ante `IntegrityError`.

## Observaciones (no son defectos de codigo, discrepancias doc vs. implementacion)
- `docs/historias-usuario.md` HU-08 usa `fecha_desde`/`fecha_hasta`; la API real usa `plazo_desde`/`plazo_hasta`. Tampoco hay `422` cuando `plazo_desde > plazo_hasta` (HU-08 criterio 6; la API devuelve lista vacia) ni orden por `fecha_limite` (RN-08.4; se ordena por `id` descendente). **Candidato a defecto menor (DEF-03, Baja)** si el PO confirma el criterio.
- HU-09: la doc dice historial del mas reciente al mas antiguo y endpoint `/historial` (RN-09.4); la API real es `GET /api/expedientes/{id}/auditoria`, en orden cronologico ascendente, y el abogado recibe 403. Las pruebas siguen la API real.
- `GET /api/auditoria` (admin) no expone `hash_anterior` en `AuditoriaOut`; la cadena solo se puede verificar con `/api/auditoria/verificar`.
