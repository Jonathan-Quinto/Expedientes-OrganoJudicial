// Frontend del MVP: sigue la Guía de estilo y los wireframes de la presentación.
// El token vive en memoria (no en localStorage): al recargar se vuelve a iniciar sesión.
let token = null, rol = null, nombre = '', actual = null, vista = 'bandeja';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ESTADOS = { radicado: 'Radicado', en_tramite: 'En trámite', en_audiencia: 'En audiencia', con_sentencia: 'Con sentencia', archivado: 'Archivado' };
const MATERIAS = { civil: 'Civil', familia: 'Familia', laboral: 'Laboral', penal: 'Penal' };
const ROLES = { secretario: 'Secretario judicial', juez: 'Juez', admin: 'Administrador', abogado: 'Abogado' };
const TIPOS = { radicacion: 'Radicación', cambio_estado: 'Cambio de estado' };
const ACCIONES = { CREAR_EXPEDIENTE: 'Creó el expediente', CONSULTAR_EXPEDIENTE: 'Consultó', CAMBIAR_ESTADO: 'Cambió el estado', AGREGAR_ACTUACION: 'Agregó una actuación', LOGIN: 'Inició sesión', LOGIN_FALLIDO: 'Intento de acceso fallido', CONSULTA_PUBLICA: 'Consulta pública', CONSULTA_PUBLICA_FALLIDA: 'Consulta pública fallida' };
const accionTxt = (a) => ACCIONES[a] || String(a || '').toLowerCase().replace(/_/g, ' ');
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
    const err = new Error(typeof d === 'string' ? d : 'Revisa los datos ingresados.');
    if (Array.isArray(d)) err.campos = d;
    throw err;
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
    : [['bandeja', rol === 'juez' ? 'Mis expedientes' : rol === 'abogado' ? 'Mis casos' : 'Bandeja de expedientes']];
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
    $('l-f-juez').classList.toggle('hidden', !['secretario', 'admin'].includes(rol));
    if (rol === 'secretario') { cargarJueces(); cargarAbogados(); }
    else if (rol === 'admin') cargarJueces();
    rol === 'admin' ? abrirAuditoria() : abrirBandeja();
  } catch (err) { $('l-error').textContent = err.message; }
});
$('btn-salir').addEventListener('click', () => location.reload());

// ---------- Bandeja ----------
async function abrirBandeja() {
  $('b-titulo').textContent = rol === 'juez' ? 'Mis expedientes' : rol === 'abogado' ? 'Mis casos' : 'Bandeja de expedientes';
  $('b-sub').textContent = rol === 'juez' ? 'Solo ves los expedientes asignados a tu despacho.' : rol === 'abogado' ? 'Solo ves los expedientes en los que eres el abogado.' : 'Todos los expedientes del juzgado.';
  mostrar('bandeja');
  await cargarBandeja();
}

function filtros() {
  const p = new URLSearchParams();
  const q = $('buscar').value.trim();
  if (q) p.set('q', q);
  [['estado', 'f-estado'], ['materia', 'f-materia'], ['juez_id', 'f-juez'], ['plazo_desde', 'f-desde'], ['plazo_hasta', 'f-hasta']].forEach(([k, id]) => {
    const v = $(id).value;
    if (v && !(k === 'juez_id' && $('l-f-juez').classList.contains('hidden'))) p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function cargarBandeja() {
  const desde = $('f-desde').value, hasta = $('f-hasta').value;
  $('f-error').textContent = '';
  if (desde && hasta && desde > hasta) { $('f-error').textContent = 'La fecha "desde" no puede ser posterior a "hasta".'; return; }
  const qs = filtros();
  let lista, todos, alertas;
  try {
    [lista, todos, alertas] = await Promise.all([
      api(`/api/expedientes${qs}`),
      qs ? api('/api/expedientes') : null,
      api('/api/expedientes/alertas'),
    ]);
  } catch (err) { $('f-error').textContent = err.message; return; }
  if (!todos) todos = lista;
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
  $('sin-res').textContent = qs ? 'Ningún expediente coincide con los filtros.' : 'No hay expedientes para mostrar.';
  $('sin-res').classList.toggle('hidden', lista.length > 0);
  document.querySelectorAll('#tabla .btn-abrir').forEach((b) => b.addEventListener('click', () => abrirDetalle(b.dataset.id)));
}
let tBuscar;
$('buscar').addEventListener('input', () => { clearTimeout(tBuscar); tBuscar = setTimeout(cargarBandeja, 200); });
['f-estado', 'f-materia', 'f-juez', 'f-desde', 'f-hasta'].forEach((id) => $(id).addEventListener('change', cargarBandeja));
$('f-filtros').addEventListener('submit', (e) => e.preventDefault());
$('btn-limpiar').addEventListener('click', () => {
  $('buscar').value = '';
  ['f-estado', 'f-materia', 'f-juez', 'f-desde', 'f-hasta'].forEach((id) => { $(id).value = ''; });
  cargarBandeja();
});

async function cargarJueces() {
  const j = await api('/api/jueces');
  $('sel-juez').innerHTML = j.map((x) => `<option value="${x.id}">${esc(x.nombre)}</option>`).join('');
  $('f-juez').innerHTML = '<option value="">Todos</option>' + j.map((x) => `<option value="${x.id}">${esc(x.nombre)}</option>`).join('');
}

async function cargarAbogados() {
  try {
    const a = await api('/api/abogados');
    $('sel-abogado').innerHTML = '<option value="">Sin abogado</option>' + a.filter((x) => x.activo !== false).map((x) => `<option value="${x.id}">${esc(x.nombre)}</option>`).join('');
  } catch (_) { /* el registro funciona sin abogado */ }
}

// Validación visible por campo
const CAMPOS = ['demandante', 'demandado', 'fecha_limite'];
function errCampo(campo, msg) {
  const el = document.querySelector(`#f-nuevo [name="${campo}"]`);
  $(`e-${campo}`).textContent = msg || '';
  if (msg) { el.setAttribute('aria-invalid', 'true'); } else { el.removeAttribute('aria-invalid'); }
}
function validarNuevo(d) {
  const hoy = new Date(); const p = (n) => String(n).padStart(2, '0');
  const hoyIso = `${hoy.getFullYear()}-${p(hoy.getMonth() + 1)}-${p(hoy.getDate())}`;
  const m = {};
  if ((d.demandante || '').trim().length < 3) m.demandante = 'El demandante debe tener al menos 3 caracteres.';
  if ((d.demandado || '').trim().length < 3) m.demandado = 'El demandado debe tener al menos 3 caracteres.';
  if (d.fecha_limite && d.fecha_limite < hoyIso) m.fecha_limite = 'El plazo no puede ser una fecha pasada.';
  CAMPOS.forEach((c) => errCampo(c, m[c]));
  const primero = CAMPOS.find((c) => m[c]);
  if (primero) document.querySelector(`#f-nuevo [name="${primero}"]`).focus();
  return !primero;
}
CAMPOS.forEach((c) => document.querySelector(`#f-nuevo [name="${c}"]`).addEventListener('input', () => errCampo(c, '')));

$('f-nuevo').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const d = Object.fromEntries(new FormData(ev.target));
  $('n-msg').innerHTML = '';
  if (!validarNuevo(d)) return;
  d.demandante = d.demandante.trim(); d.demandado = d.demandado.trim();
  d.juez_id = d.juez_id ? Number(d.juez_id) : null;
  if (d.abogado_id) d.abogado_id = Number(d.abogado_id); else delete d.abogado_id;
  if (!d.fecha_limite) delete d.fecha_limite;
  try {
    const e = await api('/api/expedientes', { method: 'POST', body: JSON.stringify(d) });
    $('n-msg').innerHTML = `<div class="ok">Registrado <b class="mono">${esc(e.numero)}</b>. Código de consulta para las partes: <b class="mono">${esc(e.codigo_consulta)}</b></div>`;
    ev.target.reset();
    CAMPOS.forEach((c) => errCampo(c, ''));
    cargarBandeja();
  } catch (err) {
    const gen = [];
    (err.campos || []).forEach((x) => {
      const c = Array.isArray(x.loc) ? x.loc[x.loc.length - 1] : '';
      if (CAMPOS.includes(c)) errCampo(c, x.msg); else gen.push(x.msg);
    });
    const msg = err.campos ? gen.join(' ') : err.message;
    if (msg) $('n-msg').innerHTML = `<div class="error" role="alert">${esc(msg)}</div>`;
    const primero = CAMPOS.find((c) => $(`e-${c}`).textContent);
    if (primero) document.querySelector(`#f-nuevo [name="${primero}"]`).focus();
  }
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
  $('p-actuacion').classList.toggle('hidden', !['secretario', 'abogado'].includes(rol));
  $('h-actuacion').textContent = rol === 'abogado' ? 'Registrar escrito' : 'Registrar actuación';
  $('btn-act').textContent = rol === 'abogado' ? 'Agregar escrito' : 'Agregar actuación';
  $('tab-auditoria').classList.toggle('hidden', rol === 'abogado');
  $('d-aud').innerHTML = ''; $('d-aud-error').textContent = '';
  audCargada = false;
  selTab('historial');
  $('d-error').textContent = '';
  mostrar('detalle');
}
let audCargada = false;
function selTab(t) {
  ['historial', 'auditoria'].forEach((x) => {
    const on = x === t;
    $(`tab-${x}`).setAttribute('aria-selected', on);
    $(`tab-${x}`).tabIndex = on ? 0 : -1;
    $(`pn-${x}`).classList.toggle('hidden', !on);
  });
  if (t === 'auditoria' && !audCargada) cargarAudExp();
}
document.querySelectorAll('.tabs [role="tab"]').forEach((b) => {
  b.addEventListener('click', () => selTab(b.dataset.tab));
  b.addEventListener('keydown', (ev) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(ev.key) || rol === 'abogado') return;
    const t = b.dataset.tab === 'historial' ? 'auditoria' : 'historial';
    selTab(t); $(`tab-${t}`).focus();
  });
});

async function cargarAudExp() {
  $('d-aud-error').textContent = '';
  try {
    const reg = await api(`/api/expedientes/${actual.id}/auditoria`);
    audCargada = true;
    $('d-aud').innerHTML = reg.length ? reg.map((r) => {
      const c = cambio(r);
      return `<li><div><div style="font-weight:600">${esc(accionTxt(r.accion))}</div>
      <div class="sub">${esc(r.usuario)}${c !== '—' ? ` · ${esc(c)}` : ''}</div>
      <div class="meta">${fechaHora(r.fecha)} · IP ${esc(r.ip || '—')} · ${esc(String(r.hash || '').slice(0, 8))}…</div></div></li>`;
    }).join('') : '<li><div class="sub">Sin registros de auditoría.</div></li>';
  } catch (err) { $('d-aud-error').textContent = err.message; }
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
