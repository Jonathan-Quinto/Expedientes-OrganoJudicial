// Frontend del MVP: sigue la Guía de estilo y los wireframes de la presentación.
// El token vive en memoria (no en localStorage): al recargar se vuelve a iniciar sesión.
let token = null, rol = null, nombre = '', actual = null, vista = 'bandeja';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ESTADOS = { radicado: 'Radicado', en_tramite: 'En trámite', en_audiencia: 'En audiencia', con_sentencia: 'Con sentencia', archivado: 'Archivado' };
const MATERIAS = { civil: 'Civil', familia: 'Familia', laboral: 'Laboral', penal: 'Penal' };
const ROLES = { secretario: 'Secretario judicial', juez: 'Juez', admin: 'Administrador' };
const TIPOS = { radicacion: 'Radicación', cambio_estado: 'Cambio de estado' };
const chip = (e) => `<span class="chip ${esc(e)}">${esc(ESTADOS[e] || e)}</span>`;
const materia = (m) => MATERIAS[m] || m;
const fecha = (d) => d ? d.split('-').reverse().join('/') : '—';
const fechaHora = (iso) => { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

function plazo(e) {
  if (!e.fecha_limite) return { txt: '—', cls: 'plazo-normal' };
  if (['con_sentencia', 'archivado'].includes(e.estado)) return { txt: fecha(e.fecha_limite), cls: 'plazo-normal' };
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((new Date(e.fecha_limite + 'T00:00:00') - hoy) / 86400000);
  if (dias < 0) return { txt: `${fecha(e.fecha_limite)} · vencido`, cls: 'plazo-vencido' };
  if (dias <= 5) return { txt: `${fecha(e.fecha_limite)} · vence pronto`, cls: 'plazo-pronto' };
  return { txt: fecha(e.fecha_limite), cls: 'plazo-normal' };
}

async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const d = data && data.detail;
    throw new Error(typeof d === 'string' ? d : 'Revisa los datos ingresados.');
  }
  return data;
}

function mostrar(v) {
  vista = v;
  ['login', 'bandeja', 'detalle', 'auditoria'].forEach((x) => $(`v-${x}`).classList.toggle('hidden', x !== v));
  pintarNav();
  window.scrollTo(0, 0);
}

function pintarNav() {
  const nav = $('nav');
  if (!token) { nav.classList.add('hidden'); return; }
  const items = rol === 'admin'
    ? [['auditoria', 'Bitácora de auditoría'], ['bandeja', 'Expedientes']]
    : [['bandeja', rol === 'juez' ? 'Mis expedientes' : 'Bandeja de expedientes']];
  nav.innerHTML = items.map(([v, t]) => `<button type="button" data-v="${v}" class="${vista === v || (v === 'bandeja' && vista === 'detalle') ? 'activo' : ''}">${t}</button>`).join('');
  nav.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => (b.dataset.v === 'auditoria' ? abrirAuditoria() : abrirBandeja())));
  nav.classList.remove('hidden');
}

// ---------- Sesión ----------
$('f-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('l-error').textContent = '';
  try {
    const t = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: $('l-user').value.trim(), password: $('l-pass').value }) });
    token = t.access_token; rol = t.rol; nombre = t.nombre;
    $('quien').innerHTML = `${esc(nombre)} · <em>${esc(ROLES[rol] || rol)}</em>`;
    $('sesion').classList.remove('hidden');
    $('f-nuevo').classList.toggle('hidden', rol !== 'secretario');
    if (rol === 'secretario') cargarJueces();
    rol === 'admin' ? abrirAuditoria() : abrirBandeja();
  } catch (err) { $('l-error').textContent = err.message; }
});
$('btn-salir').addEventListener('click', () => location.reload());

// ---------- Bandeja ----------
async function abrirBandeja() {
  $('b-titulo').textContent = rol === 'juez' ? 'Mis expedientes' : 'Bandeja de expedientes';
  $('b-sub').textContent = rol === 'juez' ? 'Solo ves los expedientes asignados a tu despacho.' : 'Todos los expedientes del juzgado.';
  mostrar('bandeja');
  await cargarBandeja();
}

async function cargarBandeja() {
  const q = $('buscar').value.trim();
  const [lista, todos, alertas] = await Promise.all([
    api(`/api/expedientes${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    api('/api/expedientes'),
    api('/api/expedientes/alertas'),
  ]);
  $('st-total').textContent = todos.length;
  $('st-activos').textContent = todos.filter((e) => ['en_tramite', 'en_audiencia'].includes(e.estado)).length;
  $('st-alertas').textContent = alertas.length;
  $('tabla').innerHTML = lista.map((e) => {
    const p = plazo(e);
    return `<tr><td class="mono" style="font-size:13px;white-space:nowrap">${esc(e.numero)}</td><td>${esc(materia(e.materia))}</td>
      <td>${esc(e.demandante)} vs. ${esc(e.demandado)}</td><td>${chip(e.estado)}</td>
      <td class="${p.cls}" style="white-space:nowrap">${esc(p.txt)}</td>
      <td style="text-align:right"><button class="btn-abrir" type="button" data-id="${e.id}">Abrir</button></td></tr>`;
  }).join('');
  $('sin-res').classList.toggle('hidden', lista.length > 0);
  document.querySelectorAll('#tabla .btn-abrir').forEach((b) => b.addEventListener('click', () => abrirDetalle(b.dataset.id)));
}
let tBuscar;
$('buscar').addEventListener('input', () => { clearTimeout(tBuscar); tBuscar = setTimeout(cargarBandeja, 200); });

async function cargarJueces() {
  const j = await api('/api/jueces');
  $('sel-juez').innerHTML = j.map((x) => `<option value="${x.id}">${esc(x.nombre)}</option>`).join('');
}

$('f-nuevo').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const d = Object.fromEntries(new FormData(ev.target));
  d.juez_id = d.juez_id ? Number(d.juez_id) : null;
  if (!d.fecha_limite) delete d.fecha_limite;
  try {
    const e = await api('/api/expedientes', { method: 'POST', body: JSON.stringify(d) });
    $('n-msg').innerHTML = `<div class="ok">Registrado <b class="mono">${esc(e.numero)}</b>. Código de consulta para las partes: <b class="mono">${esc(e.codigo_consulta)}</b></div>`;
    ev.target.reset();
    cargarBandeja();
  } catch (err) { $('n-msg').innerHTML = `<div class="error">${esc(err.message)}</div>`; }
});

// ---------- Detalle ----------
async function abrirDetalle(id) {
  const e = await api(`/api/expedientes/${id}`);
  actual = e;
  const p = plazo(e);
  $('d-numero').textContent = e.numero;
  $('d-partes').textContent = `${e.demandante} vs. ${e.demandado}`;
  $('d-info').textContent = `${materia(e.materia)} · Plazo: ${p.txt}`;
  $('d-estado').className = `chip ${e.estado}`;
  $('d-estado').textContent = ESTADOS[e.estado] || e.estado;
  $('d-timeline').innerHTML = e.actuaciones.slice().reverse().map((a) => `<li><div><div style="font-weight:600">${esc(TIPOS[a.tipo] || a.tipo)}</div>
    <div class="sub">${esc(a.detalle.replace(/[a-z_]+ -> [a-z_]+/g, (m) => m.split(' -> ').map((s) => ESTADOS[s] || s).join(' → ')))}</div>
    <div class="meta">${fechaHora(a.fecha)}</div></div></li>`).join('');
  $('p-juez').classList.toggle('hidden', rol !== 'juez');
  $('p-actuacion').classList.toggle('hidden', rol !== 'secretario');
  $('d-error').textContent = '';
  mostrar('detalle');
}
$('btn-volver').addEventListener('click', abrirBandeja);

$('btn-estado').addEventListener('click', async () => {
  const motivo = $('d-motivo').value.trim();
  if (motivo.length < 5) { $('d-error').textContent = 'Escribe el motivo: queda en el expediente y en la bitácora.'; return; }
  try {
    await api(`/api/expedientes/${actual.id}/estado`, { method: 'POST', body: JSON.stringify({ estado: $('d-nuevo').value, motivo }) });
    $('d-motivo').value = '';
    abrirDetalle(actual.id);
  } catch (err) { $('d-error').textContent = err.message; }
});

$('btn-act').addEventListener('click', async () => {
  try {
    await api(`/api/expedientes/${actual.id}/actuaciones`, { method: 'POST', body: JSON.stringify({ tipo: $('a-tipo').value, detalle: $('a-detalle').value }) });
    $('a-tipo').value = $('a-detalle').value = '';
    abrirDetalle(actual.id);
  } catch (err) { $('d-error').textContent = err.message; }
});

// ---------- Auditoría ----------
async function abrirAuditoria() {
  mostrar('auditoria');
  await cargarAuditoria();
}

function cambio(r) {
  try {
    const a = JSON.parse(r.antes || '{}'), d = JSON.parse(r.despues || '{}');
    if (a.estado || d.estado) return `${ESTADOS[a.estado] || '—'} → ${ESTADOS[d.estado] || '—'}`;
  } catch (_) { /* registro sin JSON */ }
  return '—';
}

async function cargarAuditoria() {
  const reg = await api('/api/auditoria?limite=50');
  $('a-tabla').innerHTML = reg.map((r) => `<tr><td class="mono" style="font-size:12px;white-space:nowrap">${fechaHora(r.fecha)}</td><td>${esc(r.usuario)}</td>
    <td><span class="accion ${esc(r.accion)}">${esc(r.accion)}</span></td><td class="mono" style="font-size:12px">${esc(r.entidad)} #${esc(r.entidad_id)}</td>
    <td class="sub">${esc(cambio(r))}</td><td class="mono" style="font-size:12px;color:#7d8aa3">${esc(r.hash.slice(0, 8))}…</td></tr>`).join('');
}

$('btn-verificar').addEventListener('click', async () => {
  const v = await api('/api/auditoria/verificar');
  $('a-integridad').innerHTML = v.integra
    ? `<div class="ok">Cadena íntegra: ${v.registros} registros verificados, ninguno alterado.</div>`
    : `<div class="ok" style="background:#3d1d22;border-color:#7a2f38;color:#ff9c9c">Bitácora alterada en el registro #${v.roto_en_id}.</div>`;
  cargarAuditoria();
});

$('btn-copiar').addEventListener('click', async () => {
  const btn = $('btn-copiar');
  try {
    await navigator.clipboard.writeText($('d-numero').textContent);
    btn.textContent = '¡Copiado!';
  } catch {
    btn.textContent = 'No se pudo copiar';
  }
  setTimeout(() => { btn.textContent = 'Copiar número'; }, 1500);
});