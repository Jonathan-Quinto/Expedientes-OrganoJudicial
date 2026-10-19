# Triple restricción: Expediente Judicial Digital · Sprint 5

**Equipo 1 · Caso 1: Congestión Judicial** · Fecha: 2026-10-19 · Sprint 5

**Fuentes:** `docs/historias-usuario.md`, `docs/metricas.md`, `tests/DEFECTOS.md`, `security/INFORME-SEGURIDAD.md`, `README.md`.

Convención: lo que viene de las fuentes va sin marca. Lo que es estimación va marcado **(supuesto)**. Lo que no tiene dato dice **"Dato no disponible"** o **"No medido"**.

---

## 1. Alcance

### 1.1 HU incluidas

| HU | Título | Puntos | Estado en Sprint 5 | Prueba Robot |
|---|---|---|---|---|
| HU-01 | Registro del expediente digital | 5 | Implementada | 7 casos (`02_expedientes`) |
| HU-02 | Login y control de roles | 3 | Implementada | 7 casos (`01_autenticacion`) |
| HU-03 | Consulta de bitácora e integridad | 3 | Implementada | 3 casos (`03_auditoria`); criterio 5 manual |
| HU-04 | Consulta pública del ciudadano | 3 | Implementada | 5 casos (`04_consulta_publica`) |
| HU-05 | Juez gestiona el estado del expediente | 3 | Implementada | 2 casos Robot (02_expedientes) + pytest DEF-01 (xfail) |
| HU-06 | Alertas de plazo | 2 | Implementada | 2 casos Robot (02 y 07; el de 07 verifica que se excluyan archivados y con sentencia) |
| HU-07 | Abogado consulta sus expedientes y registra escritos | 5 | Desarrollada en Sprint 5 (ver nota) | 8 casos (suite 05) |
| HU-08 | Bandeja con filtros | 3 | Desarrollada en Sprint 5 (ver nota) | 9 casos (suite 06) |
| HU-09 | Historial de auditoría en el detalle del expediente | 3 | Desarrollada en Sprint 5 (ver nota) | 11 casos (suite 07) |

**Nota de estado:** `historias-usuario.md` aún dice "Planificada: no existe en el código" para HU-07, HU-08 y HU-09. Los commits `06c1638` y `84fe64d` (2026-10-19), los reportes de métricas y de seguridad citan sus endpoints y `docs/metricas.md` registra sus casos Robot en 50/50. Se toman como entregadas en el Sprint 5. **El PO debe confirmarlo y actualizar la HU.**

**Total de puntos del MVP (HU-01 a HU-09):** 30. Puntos de HU-01 a HU-06: 19. Puntos de HU-07 a HU-09 (Sprint 5): 11.

### 1.2 HU postergadas

| HU | Título | Motivo | Fuente |
|---|---|---|---|
| HU-10 | Adjuntar documentos PDF con hash SHA-256 | La trabaja el equipo en otra rama. Sin puntos estimados ni criterios en Sprint 5. | `historias-usuario.md` |

### 1.3 Trabajo fuera de HU que cambia el alcance

| Elemento | Estado | Fuente |
|---|---|---|
| DEF-01 Transiciones de estado sin validar (RN-05.5) | Abierto, Media | `tests/DEFECTOS.md` |
| DEF-02 Número EXP duplicable (500 al radicar) | Abierto, Alta | `tests/DEFECTOS.md` |
| DEF-03 Filtros de HU-08 sin 422 ni orden por `fecha_limite` | Candidato, Baja (pendiente de confirmar con el PO) | `tests/DEFECTOS.md` |
| 28 hallazgos de seguridad (4 Alta, 10 Media, 11 Baja, 3 Info) | Todos abiertos | `security/INFORME-SEGURIDAD.md` |
| Escaneo OpenVAS del staging (SEC-28) | Pendiente de ejecución | `security/INFORME-SEGURIDAD.md` |

---

## 2. Tiempo

### 2.1 Velocidad en puntos

| Concepto | Valor | Fuente |
|---|---|---|
| Puntos entregados en Sprint 5 (HU-07, HU-08, HU-09) | **11** | Puntos propuestos en `historias-usuario.md`; se confirman en planning |
| Puntos acumulados del MVP (HU-01 a HU-09) | **30** | Mismo origen |
| Velocidad de Sprint 3 | Dato no disponible | No hay registro |
| Velocidad promedio por sprint | No calculable (solo hay un sprint con datos) | — |

> Los puntos son una propuesta del documento de historias. Se confirman en el planning del Sprint 5.

### 2.2 Horas

| Concepto | Valor | Origen |
|---|---|---|
| Horas reales registradas | Dato no disponible | No hay registro de horas en el repositorio |
| Conversión de puntos a horas | **10 h por punto** (esfuerzo total del equipo) **(supuesto)** | Supuesto para estimar; ver `presupuesto.md` |
| Horas del Sprint 5 (11 pts) | **110 h (supuesto)** | 11 × 10 |
| Horas del MVP (30 pts) | **300 h (supuesto)** | 30 × 10 |

### 2.3 Estimación por HU **(supuesto)**

Estimación basada en los puntos de `historias-usuario.md`, con la conversión de 10 h por punto. No es un dato medido.

| HU | Puntos | Horas estimadas (supuesto) | Sprint |
|---|---|---|---|
| HU-01 | 5 | 50 | Anterior |
| HU-02 | 3 | 30 | Anterior |
| HU-03 | 3 | 30 | Anterior |
| HU-04 | 3 | 30 | Anterior |
| HU-05 | 3 | 30 | Anterior |
| HU-06 | 2 | 20 | Anterior |
| HU-07 | 5 | 50 | Sprint 5 |
| HU-08 | 3 | 30 | Sprint 5 |
| HU-09 | 3 | 30 | Sprint 5 |
| HU-10 | No estimada | — | Postergada |
| **Total** | **30** | **300** | |

---

## 3. Recursos

### 3.1 Roles

| Persona | Rol en el equipo | Rol en el Sprint 5 |
|---|---|---|
| Leonardo Liang | Product Owner | Acepta cada HU; define criterios |
| Jonathan Quinto | Scrum Master | Facilita el refinamiento; coordina el sprint |
| Javier Pravia | Dev Backend | Responsable de HU-01, HU-02, HU-03, HU-05, HU-07 (endpoints, roles, auditoría) |
| Daniela Anaya | Dev Frontend | Responsable de HU-04, HU-06, HU-08, HU-09 (interfaz) |
| Edwin Cisneros | QA | Define y ejecuta las pruebas Robot de cada HU |

### 3.2 Herramientas

| Herramienta | Uso |
|---|---|
| Python, FastAPI, SQLAlchemy | Backend y API (`app/`) |
| PostgreSQL / SQLite | Base de datos |
| Robot Framework | Pruebas de aceptación (`tests/robot/`) |
| pytest, pytest-cov | Pruebas unitarias y cobertura (`tests/unit/`) |
| radon, pylint, flake8, ruff | Calidad y estilo |
| Docker, kind, Kubernetes | Despliegue en staging (`k8s/`) |
| GitHub Actions | CI/CD (`.github/workflows/ci-cd.yml`) |
| OpenVAS | Escaneo de vulnerabilidades (`security/openvas/`). Planificado; no ejecutado |

### 3.3 Limitaciones

| Limitación | Efecto |
|---|---|
| No hay Docker local | No se puede correr `docker compose up` en la máquina del equipo; el despliegue se valida solo en CI |
| No hay `kubectl` local | No se puede inspeccionar el cluster desde la máquina del equipo |
| OpenVAS sin ejecutar (SEC-28) | No hay resultados de red, TLS ni versiones de servicios |
| `cloc` no instalado | Se usó radon raw y un conteo propio (ver `metricas.md`) |
| No hay registro de horas | El presupuesto y el costo son supuestos (ver `presupuesto.md`) |

---

## 4. Calidad

### 4.1 Tamaño

| Indicador | Valor | Fuente |
|---|---|---|
| LOC Python `app/` | 923 | `metricas.md` (radon raw) |
| SLOC Python `app/` | 697 | `metricas.md` |
| LLOC Python `app/` | 691 | `metricas.md` |
| LOC / ELOC JS/CSS/HTML `app/static/` | 660 / 590 | `metricas.md` (wc + grep) |
| LOC / ELOC Robot | 568 / 503 | `metricas.md` |
| LOC Python `tests/` | 404 | `metricas.md` |
| LOC / ELOC total (producción + aceptación) | 2 151 / 1 790 | `metricas.md` |

### 4.2 Defectos

| Indicador | Valor | Fuente |
|---|---|---|
| Defectos abiertos | 2: DEF-01 (Media), DEF-02 (Alta) | `tests/DEFECTOS.md` |
| Candidato a defecto | DEF-03 (Baja), pendiente de confirmar | `tests/DEFECTOS.md` |
| Densidad de defectos | 2 / 0.697 KLOC ≈ **2.9 por KLOC** | `metricas.md` |
| Edad de los defectos | **0 días** (detectados el 2026-10-19) | `metricas.md` |

### 4.3 Adecuación funcional

| Indicador | Valor | Fuente |
|---|---|---|
| Casos Robot | **50 / 50 pasan** | `metricas.md` |
| HU con caso Robot | 7 de 10 (HU-01, 02, 03, 04, 07, 08, 09) | `metricas.md` |
| HU sin caso Robot | HU-10 (postergada) | `metricas.md` y `historias-usuario.md` (corregido por el orquestador) |
| Casos pytest | 42: 40 pasan, 2 xfail, 0 fallan | `metricas.md` |

> **Nota:** el orquestador revisó `results/output.xml` caso por caso: HU-05 y HU-06 tienen 2 casos Robot cada una. La discrepancia anterior venía de contar por etiquetas de suite.

### 4.4 Seguridad

| Indicador | Valor | Fuente |
|---|---|---|
| Hallazgos | 28 | `security/INFORME-SEGURIDAD.md` |
| Por severidad | Crítica 0 · **Alta 4** · Media 10 · Baja 11 · Info 3 | Mismo informe |
| Estado | Todos abiertos | Mismo informe |
| Densidad | 28 / 0.697 KLOC ≈ **40.2 por KLOC** | `metricas.md` |
| Edad | 0 días | `metricas.md` |
| Escaneo dinámico (OpenVAS) | **No medido** (pendiente, SEC-28) | `metricas.md` |

### 4.5 Usabilidad

**No medido.** No hay pruebas con usuarios reales ni encuestas (`metricas.md`, sección 3).

### 4.6 Confiabilidad

| Indicador | Valor | Fuente |
|---|---|---|
| Pruebas pytest fallidas | 0 | `metricas.md` |
| Pruebas xfail (defectos conocidos) | 2 | `metricas.md` |
| Cobertura de sentencias | **93 %** (33 de 503 sin cubrir) | `metricas.md` |
| Cobertura más baja | `admin` 79 %, `expedientes` 86 % | `metricas.md` |
| Cobertura de ramas | **No medido** | `metricas.md` |

### 4.7 Mantenibilidad

| Indicador | Valor | Fuente |
|---|---|---|
| Complejidad ciclomática promedio | A (1.92) | `metricas.md` (radon cc) |
| Funciones con complejidad C o peor | 0. Máximo: `expedientes.listar` = 9 | `metricas.md` |
| Índice de mantenibilidad (promedio simple) | ≈ 67.5, rango A en los 12 archivos. Mínimo `routers/expedientes.py` = 46.45 | `metricas.md` |
| Pylint | 4.45 / 10 (147 mensajes, mayoría de estilo y docstrings) | `metricas.md` |
| flake8 | 122 infracciones (E501 predomina) | `metricas.md` |
| ruff | 52 avisos (46 son B008, probablemente falsos positivos) | `metricas.md` |

### 4.8 Eficiencia

**No medido.** No hay pruebas de carga, tiempos de respuesta ni consumo de recursos (`metricas.md`, sección 3).

---

## 5. Resumen de la triple restricción

| Restricción | Estado | Lectura |
|---|---|---|
| **Alcance** | 9 de 10 HU implementadas (30 pts). HU-10 postergada | Alcance del MVP cumplido, con defectos abiertos |
| **Tiempo** | 11 pts en Sprint 5. Horas: supuesto (110 h) | Sin registro real de horas ni velocidad histórica |
| **Calidad** | 50/50 Robot, 40 pytest pasan, cobertura 93 %. 2 defectos (1 Alta), 28 hallazgos de seguridad (4 Alta) | Calidad funcional buena; seguridad y defectos Alta pendientes para Sprint 6 |

---

## 6. Supuestos

| # | Supuesto | Valor |
|---|---|---|
| S1 | Conversión de puntos a horas, esfuerzo total del equipo | 10 h por punto |
| S2 | HU-07, HU-08 y HU-09 entregadas en el Sprint 5 | Sí (ver nota 1.1) |
| S3 | Puntos de `historias-usuario.md` confirmados en planning | Sin cambios |

## 7. Datos no disponibles

- Horas reales por persona y por HU.
- Velocidad y alcance del Sprint 3.
- Resultados de OpenVAS.
- Mediciones de usabilidad y eficiencia.
