# Domingo 25/10 — Sprint Review y Retro (guion de Leonardo)

## Antes de la reunión (30 min antes)

1. Traer lo último de `main`:
   ```powershell
   cd $HOME\Documents\Expedientes-OrganoJudicial
   git checkout main
   git pull
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements-dev.txt
   ```
2. Reiniciar la base para que la demo se vea limpia: si el servidor está corriendo, Ctrl+C;
   luego `del expedientes.db` y `uvicorn app.main:app --reload`.
3. Dejar abiertas 4 pestañas: http://localhost:8000, http://localhost:8000/docs,
   `results/report.html` y la pestaña **Actions** del repo.
4. Confirmar en el grupo que Javier, Daniela y Edwin tienen su demo lista y los PR ya están mergeados.

## Durante la Review (15 min)

### 1. Apertura — tú (1 min)

> "Buenas, soy Leonardo, el Product Owner. El objetivo de este sprint era que el expediente pase de papel a
> digital con evidencia verificable. En el Sprint 1 ya aceptamos las seis historias base: registro de
> expedientes, login por roles, bitácora con verificación de integridad, consulta ciudadana, decisiones del
> juez y alertas de plazo. Esta semana el equipo trabajó en adjuntar documentos PDF al expediente. Vamos a
> ver la demo y al final decido si la historia se acepta."

### 2. Javier — demo del backend de PDF en `/docs` (3 min)
### 3. Daniela — sección "Documentos" en pantalla y vista en celular (3 min)
### 4. Edwin — suite en verde (28 passed esperados) y Actions (2 min)

Mientras presentan, marca cada criterio:

| Criterio de la historia de documentos | Cómo lo ves en la demo | ✅ / ❌ |
|---|---|---|
| Solo acepta PDF | Subir un `.docx` o `.jpg` da error | |
| Máximo 10 MB | Un PDF de más de 10 MB da error | |
| Guarda la huella SHA-256 | Aparece el hash en el documento subido | |
| Subida y descarga quedan en la bitácora | `admin1` → Bitácora muestra las dos acciones | |
| Un juez no ve documentos de otro juez | `juez2` no puede ver ni descargar los de `juez1` | |
| La bitácora sigue íntegra | "Verificar integridad" dice "Cadena íntegra" | |
| Pruebas pasan | Edwin muestra `05_documentos.robot` en verde y Actions en verde | |

### 5. Decisión — tú (3 min)

**Si todos los criterios están en ✅:**

> "Revisé los criterios uno por uno y todos se cumplen, así que **acepto** la historia de documentos PDF.
> Para el próximo sprint la prioridad es: primero, **migraciones con Alembic**, porque cada cambio a la base
> hoy nos obliga a borrarla, y con ella se borra la bitácora, que es la evidencia legal del sistema; y
> segundo, el **aviso de plazos por correo**, porque hoy la alerta solo existe si alguien entra a mirar la
> pantalla. La historia de Alembic ya está escrita en el PR #1 con sus criterios."

**Si falla algún criterio:**

> "La historia de documentos queda **con observaciones**: falta [criterio que falló]. No la acepto todavía.
> Pasa como prioridad uno del próximo sprint para cerrarla, y después seguimos con Alembic y el aviso por
> correo."

### 6. Retrospectiva — Jonathan (3 min)

Ten una respuesta tuya lista para cada pregunta:

- **Qué salió bien:** todos tuvimos el proyecto corriendo a tiempo y la suite pasó 22/22 desde el primer día.
- **Qué mejorar:** los accesos al repo llegaron tarde y frenaron los primeros PR; además, las pruebas
  ensucian la base de la demo.
- **Compromiso:** que las pruebas usen una base aparte para no tocar la de la demo, y dar los accesos el
  primer día del sprint.

## Después de la reunión

- Mandar al grupo: historia aceptada o no, prioridad del Sprint 2 y el compromiso de la retro.
- Marcar en `docs/sprint1-product-owner.md` el último punto del checklist: "Review del domingo dirigida".
