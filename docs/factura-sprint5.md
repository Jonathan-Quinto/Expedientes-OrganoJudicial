# Factura de consultoría · Neuronix

| | |
|---|---|
| **Número de factura** | **NX-S5-001** |
| **Fecha** | 2026-10-19 |
| **Cliente** | Órgano Judicial – Caso 1 (Congestión Judicial) |
| **Consultora** | Equipo 1 (Ingeniería de Software III) |
| **Proyecto** | Expediente Judicial Digital (MVP) |
| **Sprint facturado** | Sprint 5 (con el MVP acumulado de HU-01 a HU-09) |
| **Moneda** | Neuronas |

---

## 1. Actividades del Sprint 5

Responsable según el reparto de `docs/historias-usuario.md`. Evidencias: commits del historial y archivos del repositorio. Los archivos se toman de los reportes del repositorio; no se verificó cada archivo contra el diff de git.

| # | Actividad | Responsable | Commit(s) | Archivos principales (evidencia) |
|---|---|---|---|---|
| 1 | HU-07: rol abogado y patrocinio de expedientes | Javier Pravia (Backend); apoyo Daniela Anaya | `06c1638` | `app/models.py`, `app/routers/expedientes.py`, `tests/robot/05_*.robot` |
| 2 | HU-08: bandeja con filtros (estado, materia, juez, plazo) | Daniela Anaya (interfaz); apoyo Javier Pravia | `06c1638`, `84fe64d` | `app/routers/expedientes.py`, `app/static/app.js`, `tests/robot/06_*.robot` |
| 3 | HU-09: historial de auditoría por expediente | Daniela Anaya (vista); apoyo Javier Pravia | `06c1638`, `84fe64d` | `app/routers/expedientes.py` (`GET /api/expedientes/{id}/auditoria`), `app/static/app.js`, `tests/robot/07_*.robot` |
| 4 | Validaciones y vista del abogado en el frontend | Daniela Anaya | `84fe64d` | `app/static/app.js`, `app/static/index.html` |
| 5 | Pruebas de aceptación Robot (50/50) y pruebas unitarias pytest | Edwin Cisneros (QA) | `8e7a716` | `tests/robot/*.robot`, `tests/unit/test_api.py` |
| 6 | Registro de defectos DEF-01 y DEF-02 | Edwin Cisneros (QA) | (sin commit propio en el historial) | `tests/DEFECTOS.md` |
| 7 | Pipeline CI con lint, pytest y cobertura; endurecimiento de Kubernetes | Por confirmar (sin responsable de DevOps asignado) | `133aaf8` | `.github/workflows/ci-cd.yml`, `k8s/*.yaml` |
| 8 | Informe de seguridad (28 hallazgos) | Por confirmar | `801479c` | `security/INFORME-SEGURIDAD.md` |
| 9 | Historias de usuario v1.0 | Jonathan Quinto (SM); aceptación Leonardo Liang (PO) | `7002c79` | `docs/historias-usuario.md` |
| 10 | Métricas de código y calidad | Por confirmar | `9265184` | `docs/metricas.md` |
| 11 | Subagentes del equipo | Jonathan Quinto (SM) | `502358d` | `.claude/agents/*.md` |

---

## 2. HU corregidas en esta factura

| HU | Corrección | Estado |
|---|---|---|
| HU-07 | Estado de "Planificada" a **Implementada** (código y prueba Robot 05 existen). | Aplicado en `historias-usuario.md` |
| HU-08 | Estado a **Implementada**. Parámetros reales: `plazo_desde` y `plazo_hasta` (no `fecha_desde`/`fecha_hasta`). Pendiente: el 422 por rango inválido y el orden por `fecha_limite` (DEF-03). | Aplicado en `historias-usuario.md`; el 422 y el orden siguen pendientes |
| HU-09 | Estado a **Implementada**. Endpoint real: `GET /api/expedientes/{id}/auditoria` (no `/historial`). Orden: cronológico ascendente. Abogado: 403. | Aplicado en `historias-usuario.md`; el PO valida el orden en la Review |
| HU-05 | Trazabilidad de pruebas corregida: 2 casos Robot (02_expedientes). DEF-01 abierto. | Verificado |
| HU-06 | Prueba reforzada: además del caso de 02, el de 07 verifica que se excluyan archivados y con sentencia (cierra R-06.1). | Verificado |

---

## 3. Roles y horas **(supuesto)**

Horas y tarifas son supuestos (ver `docs/presupuesto.md`). No hay registro real de horas.

| Rol | Persona | Horas (supuesto) | Tarifa (neuronas/h, supuesto) | Importe (neuronas) |
|---|---|---|---|---|
| Product Owner | Leonardo Liang | 30 | 400 | 12 000 |
| Scrum Master | Jonathan Quinto | 40 | 340 | 13 600 |
| Dev Backend | Javier Pravia | 100 | 380 | 38 000 |
| Dev Frontend | Daniela Anaya | 70 | 280 | 19 600 |
| QA | Edwin Cisneros | 60 | 280 | 16 800 |
| **Total** | | **300** | | **100 000** |

---

## 4. Métricas reales (repositorio)

Fuente: `docs/metricas.md`, `tests/DEFECTOS.md`, `security/INFORME-SEGURIDAD.md`.

| Métrica | Valor |
|---|---|
| Pruebas Robot | 50 / 50 pasan |
| Pruebas pytest | 42: 40 pasan, 2 xfail, 0 fallan |
| Cobertura de sentencias (`app/`) | 93 % |
| LOC / SLOC Python `app/` | 923 / 697 |
| LOC / ELOC total (producción + aceptación) | 2 151 / 1 790 |
| Defectos abiertos | 2: DEF-01 (Media), DEF-02 (Alta) |
| Hallazgos de seguridad abiertos | 28: Alta 4 · Media 10 · Baja 11 · Info 3 |
| Escaneo OpenVAS | Pendiente de ejecución |
| Historias implementadas | 9 de 10 (HU-10 postergada) · 30 puntos |

---

## 5. Resumen económico

| Concepto | Neuronas |
|---|---|
| Subtotal (Sprint 5 con MVP acumulado, desglose de la tabla 3) | 100 000 |
| Impuestos | Dato no disponible |
| **Valor de la factura NX-S5-001** | **100 000** |

**Presupuesto Neuronix**

| Concepto | Neuronas |
|---|---|
| Presupuesto total | 1 000 000 |
| Gastado en aplicaciones | − 650 000 |
| Valor del proyecto (ya descontado) | − 100 000 |
| **Saldo disponible** | **250 000** |

**Cuenta:** 1 000 000 − 650 000 − 100 000 = **250 000**

---

## 6. Supuestos

- Las horas y las tarifas por rol son supuestos (ver `docs/presupuesto.md`). Se calibraron para que el MVP cueste 100 000 neuronas.
- El valor de la factura es el valor del proyecto (100 000), ya descontado del saldo.
- Los archivos de la sección 1 vienen de los reportes del repositorio, no de un diff de git.
- Los responsables marcados "Por confirmar" no tienen asignación en las fuentes.

## 7. Datos no disponibles

- Horas reales por persona.
- Impuestos aplicables.
- Responsables de CI/CD, seguridad y métricas.
- Resultado de OpenVAS.
