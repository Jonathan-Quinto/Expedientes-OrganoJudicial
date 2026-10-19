# Métricas de código y calidad

**Fecha de medición:** 2026-10-19 · **Rama:** sprint5 · **Alcance:** `app/` (Python), `app/static/` (JS/CSS/HTML), `tests/` (Python y Robot)

## 1. Tabla de métricas

| Métrica | Cómo se mide | Herramienta | Resultado | Interpretación |
|---|---|---|---|---|
| LOC Python `app/` | Líneas físicas totales (LOC), líneas de código (SLOC) y líneas lógicas (LLOC) | radon raw | LOC 923 · SLOC 697 · LLOC 691 · comentarios 26 · en blanco 173 | Backend pequeño. Comentarios muy bajos (3 % de las líneas): el código se apoya en nombres, no en comentarios. |
| LOC Python `tests/` | Igual que arriba, sobre `tests/` | radon raw | LOC 404 · SLOC 286 (radon) · no vacías y sin comentario: 291 (one-liner) | Las pruebas unitarias son más cortas que el código que prueban. La diferencia 286/291 se debe a cómo radon trata los docstrings. |
| LOC JS/CSS/HTML `app/static/` | Líneas totales (`wc -l`) y líneas no vacías ni de comentario (`grep -vE '^\s*$\|^\s*(//\|/\*\|\*\|<!--)'`) | wc + grep (no hay cloc) | 660 líneas totales · 590 no vacías ni comentario (app.js 300/271, index.html 151/140, styles.css 141/112, consulta.html 34/34, consulta.js 29/28, fonts.css 5/5) | El frontend es de tamaño pequeño. `app.js` concentra casi la mitad. El método es aproximado: no quita comentarios en línea ni el cuerpo de bloques `/* */` que no empiezan con `*`. |
| LOC Robot Framework | Igual que JS/CSS/HTML, sobre las 7 suites y los 2 `.resource` | wc + grep | 568 líneas totales · 503 no vacías ni comentario | Pruebas de aceptación de tamaño medio. |
| LOC total (producción + pruebas de aceptación) | Suma de `app/` (Python), `app/static/` y Robot. No incluye `tests/` en Python | radon raw + one-liner | 2 151 LOC · 1 790 no vacías ni comentario (697 + 590 + 503) | Tamaño del sistema para usar en las densidades de defectos. |
| Complejidad ciclomática (promedio) | Promedio de complejidad de los 59 bloques (clases, funciones, métodos) de `app/` | radon cc `-s -a` | Promedio A (1.92) | Lógica simple en general. Cada función tiene pocos caminos de decisión. |
| Complejidad ciclomática (funciones C o peor) | Funciones con rango C (11-20), D, E o F | radon cc `-s -n C` | 0 funciones en C o peor. Máximo: `expedientes.listar` = 9 (rango B). Le siguen `cargar` (seed) = 7 y `_obtener`, `registrar` = 6 | Ninguna función supera el umbral de riesgo. `listar` es la más compleja y la primera candidata a dividir si se amplían los filtros. |
| Índice de mantenibilidad (MI) | MI por archivo (escala 0-100; rango A = 20 a 100). Se muestra el promedio simple de los 12 archivos con código | radon mi `-s` | Rango A en los 12 archivos. Promedio simple ≈ 67.5. Mínimo `routers/expedientes.py` = 46.45; máximo `db.py` = 100 | Mantenible en conjunto. `expedientes.py` es el archivo con menor índice y coincide con la mayor complejidad y el mayor número de líneas largas. |
| Code smells (pylint) | Puntuación global y conteo de mensajes por código (se excluye C0114) | pylint 4.1.3 | Puntuación 4.45/10 · 147 mensajes: C0301 (línea > 100) 42 · E1136 36 · C0116 (falta docstring de función) 24 · C0115 (falta docstring de clase) 20 · C0103 (nombre) 10 · R0903 5 · C0415 4 · R0913 2 · W0707 1 · W0611 (import no usado) 1 · R0917 1 · R0914 1 | La puntuación baja se debe sobre todo a estilo y documentación (docstrings, longitud de línea), no a errores de ejecución. Los 36 E1136 (`Mapped` no es subscriptable) son muy probablemente falsos positivos de las anotaciones de SQLAlchemy. Se recomienda un `pylintrc` del proyecto antes de tomar la puntuación como objetivo. |
| Estilo (flake8) | Número total de infracciones de `app/` con configuración por defecto | flake8 | 122 infracciones. En la salida predomina E501 (línea > 79 columnas). Hay además F401 (import no usado) | Problema de estilo, sin impacto funcional. El límite de 79 columnas no coincide con la convención del proyecto (pylint usa 100). |
| Análisis estático (ruff) | Conteo por regla con `check app --statistics` | ruff | 52 avisos: B008 46 · UP017 3 · FLY002 1 · I001 1 · F401 1 (5 corregibles con `--fix`) | 46 de 52 son B008 (llamada en valor por defecto). En FastAPI, `Depends(...)` como default es el patrón habitual, así que probablemente es un falso positivo. Solo F401 e I001 son de limpieza real. |
| Casos de prueba Robot | Número de casos por suite (líneas de la sección Test Cases) | conteo con awk | 50 casos: 01 = 7 · 02 = 7 · 03 = 3 · 04 = 5 · 05 = 8 · 06 = 9 · 07 = 11 | Cubre 7 de las 10 HU (ver fila siguiente). |
| Casos de prueba Robot por HU | Suite → HU según `Documentation` y `Test Tags` de cada archivo (la etiqueta de suite se aplica a todos sus casos) | conteo manual con grep | HU-01 = 7 · HU-02 = 7 · HU-03 = 3 · HU-04 = 5 · HU-07 = 8 · HU-08 = 9 · HU-09 = 11. **Sin caso Robot:** HU-05, HU-06, HU-10 | Las HU sin caso de aceptación Robot son un hueco. HU-05 solo tiene prueba pytest (DEF-01, xfail). HU-06 y HU-10 no tienen ninguna prueba registrada en esta medición. |
| Casos de prueba pytest (`tests/unit`) | Número de casos recolectados y resultado de ejecución | pytest | 42 ejecutados · 40 pasados · 2 xfailed (DEF-01 y DEF-02) · 0 fallados (dato del orquestador, verificado hoy). Recolección: 42 | Sin fallos. Los 2 xfail son defectos conocidos documentados, no regresiones. No se desglosó por HU. |
| Cobertura de código | Sentencias cubiertas sobre `app/` | pytest-cov (dato del orquestador) | Total 93 % (503 sentencias, 33 sin cubrir). audit, config, db, models, schemas y publico 100 % · security 98 % · auth 97 % · seed 97 % · main 90 % · expedientes 86 % · admin 79 % | Cobertura alta. Los puntos más débiles son `admin` (79 %) y `expedientes` (86 %), que también son los de mayor complejidad. Es cobertura de sentencias, no de ramas. |
| Defectos abiertos | Conteo de entradas `DEF-xx` en `tests/DEFECTOS.md` por severidad | lectura del registro | 2 defectos: DEF-01 Media (sin validación de transiciones de estado) · DEF-02 Alta (número EXP duplicable, 500 al radicar). Ambos abiertos | Hay un defecto de severidad Alta en un flujo central (radicar). Ambos están cubiertos por una prueba xfail. |
| Edad de los defectos | Fecha de medición menos fecha de detección | cálculo manual | DEF-01 y DEF-02: 0 días (detectados el 2026-10-19) | Todavía no hay deuda envejecida. Medir de nuevo en el próximo sprint. |
| Densidad de defectos (QA) | Defectos / KLOC, usando SLOC de `app/` (0.697 KLOC) | cálculo manual con radon | 2 / 0.697 ≈ 2.9 defectos por KLOC | Densidad baja para un MVP de este tamaño. Hay que leerla junto con la cobertura: las pruebas cubren el flujo principal. |
| Hallazgos de seguridad | Conteo de filas `SEC-xx` en `security/INFORME-SEGURIDAD.md` por severidad (tabla de la sección 2) | lectura del informe | 28 hallazgos: Alta 4 (SEC-01 a 04) · Media 10 · Baja 11 · Info 3. Todos "Abierto". SEC-28 es de proceso: el escaneo OpenVAS aún no se ha ejecutado | Ningún hallazgo crítico. Los 4 de severidad Alta son configuración por defecto (JWT_SECRET, SEED_DEMO), bloqueo de cuentas y staging con clave pública. Son corregibles con poco esfuerzo. |
| Edad de los hallazgos de seguridad | Fecha de medición menos fecha de detección (2026-10-19) | cálculo manual | 0 días para los 28 | Igual que los defectos: todo es nuevo. |
| Densidad de hallazgos de seguridad | Hallazgos / KLOC (SLOC de `app/`, 0.697 KLOC) | cálculo manual | 28 / 0.697 ≈ 40.2 por KLOC (Alta + Media + Baja: 25 / 0.697 ≈ 35.9) | Densidad alta. Muchos hallazgos son de configuración y de diseño, no de código ejecutable. |
| Densidad total (defectos + seguridad) | (2 + 28) / 0.697 KLOC | cálculo manual | ≈ 43.0 por KLOC | Indicador combinado. Sirve para comparar sprints, no como medida absoluta. |

## 2. Comandos usados

Todos se ejecutaron desde `C:\Users\jonat\projects\Expedientes-OrganoJudicial` con `.venv`. Se revisó `cloc --version`: no está instalado, por eso se usó radon raw y un conteo propio.

```
cloc --version                                   # no existe (command not found)
.venv\Scripts\python -m radon raw -s app
.venv\Scripts\python -m radon raw -s tests
.venv\Scripts\python -m radon cc app -s -a
.venv\Scripts\python -m radon cc app -s -n C     # sin salida: ninguna función C o peor
.venv\Scripts\python -m radon cc app -s -n B     # máximo: expedientes.listar = 9
.venv\Scripts\python -m radon mi app -s
.venv\Scripts\python -m pylint app --disable=C0114 --score=y
.venv\Scripts\python -m pylint app --disable=C0114 --score=n --output-format=parseable   # conteo por código
.venv\Scripts\python -m flake8 app --count
.venv\Scripts\python -m ruff check app --statistics
.venv\Scripts\python -m ruff check app --output-format concise
.venv\Scripts\python -m pytest tests/unit --collect-only -q                              # 42 casos
```

Líneas de JS/CSS/HTML, Robot y pruebas Python (método de conteo propio, porque no hay cloc):

```
# LOC = wc -l ; ELOC = líneas no vacías y que no empiezan por comentario
wc -l < app/static/app.js
grep -vE '^\s*$|^\s*(//|/\*|\*|<!--)' app/static/app.js | wc -l
# (igual para consulta.js, styles.css, consulta.html, index.html, fonts/fonts.css)

wc -l < tests/robot/<suite>.robot
grep -vE '^\s*$|^\s*#' tests/robot/<suite>.robot | wc -l
# (igual para los 7 suites y tests/robot/resources/*.resource)

# Python de tests/: recorrido de tests/**/*.py con Python: no vacías y no que empiecen por "#"
```

Casos Robot por suite y HU:

```
awk '/^\*\*\* Test Cases/{f=1;next} /^\*\*\*/{f=0} f && /^[^ \t#]/' tests/robot/<suite>.robot | wc -l
grep -n -E "Documentation|Test Tags" tests/robot/*.robot
```

Resultados de ejecución y cobertura (no se volvieron a ejecutar aquí): Robot 50/50 pasados; pytest tests/unit 42 casos, 40 pasados, 2 xfailed, 0 fallados; cobertura pytest-cov sobre `app/` 93 %. Dato del orquestador, verificado el 2026-10-19.

Fuentes de defectos y hallazgos: `tests/DEFECTOS.md` (DEF-01 a DEF-02) y `security/INFORME-SEGURIDAD.md` (tabla de la sección 2, SEC-01 a SEC-28).

## 3. No medido

- **Rendimiento y eficiencia:** no hay pruebas de carga, tiempos de respuesta ni consumo de recursos en el repositorio. No se midió.
- **Usabilidad:** no hay pruebas con usuarios reales ni encuestas. No se midió.
- **Cobertura de ramas:** solo se tiene cobertura de sentencias (pytest-cov). La de ramas no se midió.
- **Seguridad dinámica:** el escaneo OpenVAS contra el staging está pendiente de ejecución (SEC-28). No hay resultados de red, TLS ni versiones de servicios.
- **Dependencias vulnerables:** `pip-audit` no se ejecutó (SEC-22 lo recomienda; no hay lockfile).
- **Deuda técnica en tiempo (horas):** no hay datos de esfuerzo; sin SonarQube no se estima.
- **Tendencias:** solo hay una medición, así que no se puede comparar con sprints anteriores.
- **Pruebas pytest por HU:** no se desglosaron por HU, y no hay pruebas registradas para HU-06 y HU-10.
