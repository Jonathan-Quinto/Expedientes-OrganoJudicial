# Presupuesto: Expediente Judicial Digital · Sprint 5

**Equipo 1 · Caso 1: Congestión Judicial · Consultora Neuronix** · Fecha: 2026-10-19

**Fuentes:** `docs/historias-usuario.md`, `docs/metricas.md`, `tests/DEFECTOS.md`, `security/INFORME-SEGURIDAD.md`.

> **Aviso:** no hay registro de horas, tarifas ni presupuesto por sprint en el repositorio. Todas las horas y tarifas de este documento son **supuestos**, marcados así. Los datos de presupuesto (1 000 000, 650 000 y 100 000 neuronas) vienen del enunciado del proyecto.

---

## 1. Presupuesto general Neuronix

| Concepto | Neuronas | Tipo |
|---|---|---|
| Presupuesto total | 1 000 000 | Dato |
| Gastado en aplicaciones | 650 000 | Dato |
| Valor del proyecto | 100 000 | Dato |
| **Saldo disponible** | **250 000** | Cálculo |

**Cuenta:** 1 000 000 − 650 000 − 100 000 = **250 000**

El saldo de 250 000 ya descuenta el valor del proyecto (100 000). No se vuelve a restar al facturar.

---

## 2. Supuestos de horas y tarifas

### 2.1 Tarifas por hora por rol **(supuesto)**

Las tarifas se calibraron para que el costo del MVP sea 100 000 neuronas, igual al valor del proyecto.

| Rol | Persona | Tarifa (neuronas/hora) **(supuesto)** |
|---|---|---|
| Product Owner | Leonardo Liang | 400 |
| Scrum Master | Jonathan Quinto | 340 |
| Dev Backend | Javier Pravia | 380 |
| Dev Frontend | Daniela Anaya | 280 |
| QA | Edwin Cisneros | 280 |

### 2.2 Horas del equipo **(supuesto)**

Conversión: **10 horas de esfuerzo total del equipo por punto** de historia (ver `triple-restriccion.md`). Total del MVP (30 puntos): 300 horas.

| Rol | Horas MVP (supuesto) | Horas Sprint 5 (supuesto) |
|---|---|---|
| Product Owner | 30 | — |
| Scrum Master | 40 | — |
| Dev Backend | 100 | — |
| Dev Frontend | 70 | — |
| QA | 60 | — |
| **Total** | **300** | **110** (HU-07, 08, 09) |

> El reparto de horas por sprint no tiene dato real. Solo se estima el total por HU (sección 3).

---

## 3. Costo por HU **(supuesto)**

Costo = horas estimadas × tarifa promedio del equipo (100 000 / 300 h = **333.33 neuronas/hora**).

| HU | Puntos | Horas (supuesto) | Costo (neuronas) | Sprint |
|---|---|---|---|---|
| HU-01 | 5 | 50 | 16 667 | Anterior |
| HU-02 | 3 | 30 | 10 000 | Anterior |
| HU-03 | 3 | 30 | 10 000 | Anterior |
| HU-04 | 3 | 30 | 10 000 | Anterior |
| HU-05 | 3 | 30 | 10 000 | Anterior |
| HU-06 | 2 | 20 | 6 667 | Anterior |
| HU-07 | 5 | 50 | 16 667 | Sprint 5 |
| HU-08 | 3 | 30 | 10 000 | Sprint 5 |
| HU-09 | 3 | 30 | 10 000 | Sprint 5 |
| HU-10 | No estimada | — | — | Postergada |
| **Total** | **30** | **300** | **100 001** | (redondeo) |

---

## 4. Costo del MVP

| Concepto | Neuronas | Tipo |
|---|---|---|
| Costo del MVP (HU-01 a HU-09) | **100 000** | Dato (valor del proyecto) |
| Desglose por rol (ver tabla siguiente) | 100 000 | Cálculo con supuestos |
| Costo del Sprint 5 (HU-07, HU-08, HU-09) | 36 667 | Cálculo con supuestos |

### 4.1 Desglose por rol del MVP **(supuesto)**

| Rol | Horas | Tarifa (neuronas/h) | Costo (neuronas) |
|---|---|---|---|
| Product Owner | 30 | 400 | 12 000 |
| Scrum Master | 40 | 340 | 13 600 |
| Dev Backend | 100 | 380 | 38 000 |
| Dev Frontend | 70 | 280 | 19 600 |
| QA | 60 | 280 | 16 800 |
| **Total** | **300** | | **100 000** |

---

## 5. Costo estimado del Sprint 6 **(supuesto)**

Base: defectos abiertos (`tests/DEFECTOS.md`) y hallazgos de seguridad abiertos (`security/INFORME-SEGURIDAD.md`). Horas por ítem son supuestos: Alta 8 h, Media 4 h, Baja 2 h, Info 1 h para hallazgos; las horas de defectos se indican por ítem.

| Ítem | Severidad | Cantidad | Horas por ítem (supuesto) | Horas totales (supuesto) |
|---|---|---|---|---|
| DEF-01 Transiciones de estado | Media | 1 | 4 | 4 |
| DEF-02 Número EXP duplicable | Alta | 1 | 8 | 8 |
| DEF-03 Filtros de HU-08 (candidato) | Baja | 1 | 2 | 2 |
| SEC Alta (SEC-01 a SEC-04) | Alta | 4 | 8 | 32 |
| SEC Media (SEC-05 a SEC-14) | Media | 10 | 4 | 40 |
| SEC Baja (SEC-15 a SEC-25) | Baja | 11 | 2 | 22 |
| SEC Info (SEC-26 a SEC-28) | Info | 3 | 1 | 3 |
| Ejecución de OpenVAS (SEC-28) | Proceso | 1 | 4 | 4 |
| **Total** | | | | **115** |

| Concepto | Valor |
|---|---|
| Horas Sprint 6 (supuesto) | 115 |
| Tarifa promedio (supuesto) | 333.33 neuronas/h |
| **Costo estimado Sprint 6 (supuesto)** | **38 333 neuronas** |

**Cobertura del saldo:** 250 000 − 38 333 = 211 667 neuronas, si el Sprint 6 se factura con el mismo criterio.

---

## 6. Comparación con el Sprint 3

| Concepto | Sprint 3 | Sprint 5 |
|---|---|---|
| Horas reales | Dato no disponible | Dato no disponible (supuesto: 110 h) |
| Costo | Dato no disponible | 36 667 neuronas (supuesto) |
| Puntos entregados | Dato no disponible | 11 |
| Costo por punto | Dato no disponible | 3 333 neuronas (supuesto) |

**Conclusión:** no se puede comparar el costo entre sprints. Hace falta registrar horas por persona y por sprint.

---

## 7. Supuestos

| # | Supuesto | Valor |
|---|---|---|
| S1 | Tarifa por rol calibrada para cuadrar con el valor de 100 000 neuronas | Tabla 2.1 |
| S2 | Conversión de puntos a horas | 10 h por punto |
| S3 | Horas del MVP por rol | Tabla 2.2 |
| S4 | Horas por hallazgo y por defecto del Sprint 6 | Sección 5 |
| S5 | Costo del MVP igual al valor del proyecto | 100 000 |
| S6 | Costo del Sprint 5 = horas del Sprint 5 (110 h) × tarifa promedio (333.33) | 36 667 neuronas (equivale a 11 de 30 puntos, ~37 %) |

## 8. Datos no disponibles

- Horas reales por persona y sprint.
- Tarifas reales de Neuronix por rol.
- Presupuesto y costo del Sprint 3.
- Resultados de OpenVAS, que determinan el alcance real del Sprint 6.
