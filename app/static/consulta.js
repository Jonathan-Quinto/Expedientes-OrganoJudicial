const ESTADOS = { radicado: 'Radicado', en_tramite: 'En trámite', en_audiencia: 'En audiencia', con_sentencia: 'Con sentencia', archivado: 'Archivado' };
const MATERIAS = { civil: 'Civil', familia: 'Familia', laboral: 'Laboral', penal: 'Penal' };
const TIPOS = { radicacion: 'Radicación', cambio_estado: 'Cambio de estado' };

document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = document.getElementById('res');
  const p = new URLSearchParams({ numero: document.getElementById('numero').value, codigo: document.getElementById('codigo').value });
  const r = await fetch(`/api/publico/consulta?${p}`);
  const d = await r.json();
  res.innerHTML = '';
  const el = document.createElement('div');
  if (!r.ok) {
    el.className = 'error';
    el.setAttribute('role', 'alert');
    el.style.fontSize = '14px';
    el.textContent = 'Número o código de consulta incorrecto. Revísalos en la boleta que te entregó el juzgado.';
  } else {
    el.setAttribute('role', 'status');
    el.style.cssText = 'border-top:1px solid var(--borde);padding-top:14px;display:flex;flex-direction:column;gap:6px';
    el.innerHTML = '<div class="mono" style="color:var(--acento)"></div><div>Estado: <span class="chip"></span></div><div class="sub"></div>';
    el.children[0].textContent = `${d.numero} · ${MATERIAS[d.materia] || d.materia}`;
    const c = el.querySelector('.chip');
    c.classList.add(d.estado);
    c.textContent = ESTADOS[d.estado] || d.estado;
    el.children[2].textContent = `Última actuación: ${TIPOS[d.ultima_actuacion] || d.ultima_actuacion || '—'}`;
  }
  res.appendChild(el);
});
