# Daily de 1 minuto · Sprint 5

**Equipo 1 · Expediente Judicial Digital** · 2026-10-19 · Guion de unas 150 palabras, repartido en 4 personas.

| Tiempo | Persona | Rol |
|---|---|---|
| 0:00 – 0:15 | Jonathan Quinto | Scrum Master (abre y cierra) |
| 0:15 – 0:38 | Javier Pravia | Dev Backend |
| 0:38 – 0:52 | Daniela Anaya | Dev Frontend |
| 0:52 – 1:00 | Edwin Cisneros | QA (cierra con el bloqueo de seguridad) |

---

**Jonathan (0:00 – 0:15):** Ayer cerramos el Sprint 5 con 11 puntos: HU-07, HU-08 y HU-09. Robot pasa 50 de 50, pytest 40 de 42 con dos xfail conocidos, cobertura 93 %. Hoy seguimos con los defectos. Bloqueo: la historia de usuarios aún dice que HU-07 a 09 no existen.

**Javier (0:15 – 0:38):** Hicimos el rol abogado y el endpoint de auditoría por expediente. Hoy atacamos DEF-02: el número EXP se duplica al radicar, y es severidad Alta. Bloqueo: necesito la decisión del PO sobre el número y el consecutivo.

**Daniela (0:38 – 0:52):** Terminamos los filtros, la pestaña de auditoría y la vista del abogado. Hoy: validar el orden del historial de HU-09. Bloqueo: Leonardo debe confirmar si el orden es ascendente.

**Edwin (0:52 – 1:00):** Registré DEF-01 y DEF-02. Hoy: amplío las pruebas de alertas de plazo, porque HU-06 solo verifica que la lista no esté vacía. Bloqueo: OpenVAS aún no está ejecutado; sin escaneo no hay evidencia de seguridad de red.

---

**Notas (no se leen en el daily):**
- Fuentes: `docs/metricas.md` (Robot 50/50, pytest 40+2 xfail, cobertura 93 %), `tests/DEFECTOS.md` (DEF-01 Media, DEF-02 Alta), `security/INFORME-SEGURIDAD.md` (OpenVAS pendiente).
- Las horas por persona no se mencionan porque no hay registro real.
