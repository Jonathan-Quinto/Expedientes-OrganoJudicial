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
const ICONOS = {
  bandeja: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 4.5h4l1 1.5h8v7.5h-13z"/><path d="M1.5 4.5v-2h5l1 1.5"/></svg>',
  auditoria: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5 2.5 3.5v4c0 3.5 2.4 5.9 5.5 7 3.1-1.1 5.5-3.5 5.5-7v-4z"/><path d="m5.5 8 1.8 1.8L10.5 6.5"/></svg>',
};
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
  nav.innerHTML = items.map(([v, t]) => `<button type="button" data-v="${v}" class="${vista === v || (v === 'bandeja' && vista === 'detalle') ? 'activo' : ''}">${ICONOS[v]}${t}</button>`).join('');
  nav.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => (b.dataset.v === 'auditoria' ? abrirAuditoria() : abrirBandeja())));
  nav.classList.toggle('hidden', items.length < 2); // con una sola vista, la barra de comandos basta
}

// ---------- Sesión ----------
$('f-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('l-error').textContent = '';
  try {
    const t = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: $('l-user').value.trim(), password: $('l-pass').value }) });
    token = t.access_token; rol = t.rol; nombre = t.nombre;
    $('quien').innerHTML = `${esc(nombre)} · <em>${esc(ROLES[rol] || rol)}</em>`;
    $('avatar').textContent = nombre.replace(/^(Lcd[oa]\.|Lic\.|Dr[a]?\.|Juez[a]?)\s+/i, '').split(/\s+/).slice(0, 2).map((x) => x[0] || '').join('').toUpperCase();
    $('sesion').classList.remove('hidden');
    $('btn-nuevo').classList.toggle('hidden', rol !== 'secretario');
    $('cmd-abrir').classList.remove('hidden');
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
  pintarActivos();
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

// Filtros activos como chips que se quitan con un clic
const FILTROS = [['f-estado', 'Estado', (v) => ESTADOS[v]], ['f-materia', 'Materia', materia], ['f-juez', 'Juez', () => $('f-juez').selectedOptions[0]?.textContent],
  ['f-desde', 'Desde', fecha], ['f-hasta', 'Hasta', fecha], ['buscar', 'Texto', (v) => `"${v}"`]];
function pintarActivos() {
  const act = FILTROS.filter(([id]) => $(id).value.trim() && !(id === 'f-juez' && $('l-f-juez').classList.contains('hidden')));
  $('f-activos').innerHTML = act.map(([id, et, f]) => `<span class="filtro-chip">${esc(et)}: <b>${esc(f($(id).value.trim()))}</b><button type="button" data-quitar="${id}" aria-label="Quitar filtro ${esc(et)}">×</button></span>`).join('');
  $('f-activos').querySelectorAll('[data-quitar]').forEach((b) => b.addEventListener('click', () => { $(b.dataset.quitar).value = ''; cargarBandeja(); }));
  const n = act.filter(([id]) => id !== 'buscar').length;
  $('btn-filtros').textContent = n ? `Filtros · ${n}` : 'Filtros';
}
function plegar(btn, panel, abrir = $(panel).classList.contains('hidden')) {
  $(panel).classList.toggle('hidden', !abrir);
  $(btn).setAttribute('aria-expanded', abrir);
  $(btn).classList.toggle('activo', abrir);
}
$('btn-filtros').addEventListener('click', () => plegar('btn-filtros', 'f-filtros'));
$('btn-nuevo').addEventListener('click', () => { plegar('btn-nuevo', 'f-nuevo'); if (!$('f-nuevo').classList.contains('hidden')) $('n-dte').focus(); });

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
    <td class="sub">${esc(cambio(r))}</td><td class="hash">${esc(r.hash.slice(0, 8))}…</td></tr>`).join('');
}

$('btn-verificar').addEventListener('click', async () => {
  const v = await api('/api/auditoria/verificar');
  $('a-integridad').innerHTML = v.integra
    ? `<div class="ok">Cadena íntegra: ${v.registros} registros verificados, ninguno alterado.</div>`
    : `<div class="ok mal">Bitácora alterada en el registro #${v.roto_en_id}.</div>`;
  cargarAuditoria();
});

// ---------- Barra de comandos (Ctrl/⌘ K) ----------
// Punto de entrada principal: buscar expedientes, navegar, filtrar y ejecutar acciones.
const ES_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
$('cmd-abrir').querySelector('.cmd-atajo').textContent = ES_MAC ? '⌘K' : 'Ctrl K';
const ICO = {
  exp: '<path d="M4 1.5h5.5L13 5v9.5H4z"/><path d="M9.5 1.5V5H13M6.5 8.5h4M6.5 11h4"/>',
  ir: '<path d="M2 8h11M9 4l4 4-4 4"/>',
  mas: '<path d="M8 3v10M3 8h10"/>',
  filtro: '<path d="M2 3h12l-4.5 5.5V13l-3-1.5v-3z"/>',
  escudo: '<path d="M8 1.5 2.5 3.5v4c0 3.5 2.4 5.9 5.5 7 3.1-1.1 5.5-3.5 5.5-7v-4z"/><path d="m5.5 8 1.8 1.8L10.5 6.5"/>',
  mazo: '<path d="m9 2 5 5M7.5 3.5l5 5M10.5 6 4 12.5M2 14h6"/>',
  nota: '<path d="M3 13.5V11l8-8 2.5 2.5-8 8z"/><path d="M9.5 4.5 12 7"/>',
  salir: '<path d="M6 2.5H3v11h3M10 5l3 3-3 3M13 8H6"/>',
  globo: '<circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2 2.2 2 9.8 0 12M8 2c-2 2.2-2 9.8 0 12"/>',
};
const ico = (k) => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k]}</svg>`;
const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
let cmdExp = [], cmdItems = [], cmdSel = 0, cmdVolver = null;

async function enBandeja() { if (vista !== 'bandeja') await abrirBandeja(); }
async function filtrar(id, v) { await enBandeja(); $(id).value = v; cargarBandeja(); }
async function nuevoExpediente() { await enBandeja(); plegar('btn-nuevo', 'f-nuevo', true); $('n-dte').focus(); }

function comandos() {
  const c = [];
  const add = (grupo, icono, titulo, accion, extra = {}) => c.push({ grupo, icono, titulo, accion, ...extra });
  const bandeja = rol === 'juez' ? 'Mis expedientes' : rol === 'abogado' ? 'Mis casos' : rol === 'admin' ? 'Expedientes' : 'Bandeja de expedientes';
  // Acciones del expediente abierto
  if (vista === 'detalle' && actual) {
    const n = actual.numero;
    if (rol === 'juez') Object.entries(ESTADOS).filter(([k]) => k !== 'radicado' && k !== actual.estado).forEach(([k, t]) =>
      add(`En ${n}`, 'mazo', `Cambiar estado a ${t}`, () => { $('d-nuevo').value = k; $('d-motivo').focus(); }, { sub: 'Pide el motivo antes de guardar', claves: 'decision juez' }));
    if (['secretario', 'abogado'].includes(rol)) add(`En ${n}`, 'nota', rol === 'abogado' ? 'Registrar escrito' : 'Registrar actuación', () => $('a-tipo').focus(), { claves: 'actuacion nota agregar' });
    if (rol !== 'abogado') add(`En ${n}`, 'escudo', 'Ver auditoría de este expediente', () => selTab('auditoria'), { claves: 'historial bitacora' });
    add(`En ${n}`, 'ir', 'Volver a la bandeja', abrirBandeja);
  }
  // Acciones generales
  if (rol === 'secretario') add('Acciones', 'mas', 'Registrar expediente nuevo', nuevoExpediente, { claves: 'crear nuevo radicar', atajo: 'N' });
  if (rol === 'admin') add('Acciones', 'escudo', 'Verificar integridad de la bitácora', async () => { if (vista !== 'auditoria') await abrirAuditoria(); $('btn-verificar').click(); }, { claves: 'hash cadena auditoria' });
  add('Ir a', 'ir', bandeja, abrirBandeja, { claves: 'bandeja expedientes inicio' });
  if (rol === 'admin') add('Ir a', 'escudo', 'Bitácora de auditoría', abrirAuditoria, { claves: 'auditoria registros' });
  add('Ir a', 'globo', 'Consulta ciudadana', () => window.open('/consulta', '_blank', 'noopener'), { sub: 'Se abre en otra pestaña', claves: 'publico ciudadano' });
  // Filtros rápidos
  Object.entries(ESTADOS).forEach(([k, t]) => add('Filtrar', 'filtro', `Estado: ${t}`, () => filtrar('f-estado', k), { chip: k }));
  Object.entries(MATERIAS).forEach(([k, t]) => add('Filtrar', 'filtro', `Materia: ${t}`, () => filtrar('f-materia', k)));
  add('Filtrar', 'filtro', 'Plazos de los próximos 7 días', async () => {
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await enBandeja(); $('f-desde').value = iso(new Date()); $('f-hasta').value = iso(new Date(Date.now() + 7 * 864e5)); cargarBandeja();
  }, { claves: 'vence pronto alerta semana' });
  add('Filtrar', 'filtro', 'Quitar todos los filtros', async () => { await enBandeja(); $('btn-limpiar').click(); }, { claves: 'limpiar borrar' });
  add('Sesión', 'salir', 'Cerrar sesión', () => location.reload(), { claves: 'salir logout' });
  return c;
}

function pintarCmd() {
  const q = norm($('cmd-q').value.trim());
  const palabras = q.split(/\s+/).filter(Boolean);
  const coincide = (t) => palabras.every((p) => t.includes(p));
  const exp = cmdExp.filter((e) => coincide(norm(`${e.numero} ${e.demandante} ${e.demandado} ${materia(e.materia)} ${ESTADOS[e.estado]}`)))
    .slice(0, q ? 6 : 4).map((e) => ({ grupo: q ? 'Expedientes' : 'Expedientes recientes', icono: 'exp', titulo: `${e.demandante} vs. ${e.demandado}`, sub: `${e.numero} · ${materia(e.materia)}`, mono: true, chip: e.estado, accion: () => abrirDetalle(e.id) }));
  const cmds = comandos().filter((c) => coincide(norm(`${c.grupo} ${c.titulo} ${c.sub || ''} ${c.claves || ''}`)));
  // Sin texto: lo contextual primero, luego expedientes; con texto: expedientes primero
  const alFinal = (c) => ['Filtrar', 'Sesión'].includes(c.grupo);
  cmdItems = q ? [...exp, ...cmds] : [...cmds.filter((c) => !alFinal(c)), ...exp, ...cmds.filter(alFinal)];
  cmdSel = Math.min(cmdSel, Math.max(cmdItems.length - 1, 0));
  let grupo = '', html = '';
  cmdItems.forEach((it, i) => {
    if (it.grupo !== grupo) { grupo = it.grupo; html += `<li class="cmd-grupo" role="presentation">${esc(grupo)}</li>`; }
    html += `<li id="cmd-i-${i}" class="cmd-item" role="option" aria-selected="${i === cmdSel}" data-i="${i}">
      <span class="cmd-ico">${ico(it.icono)}</span>
      <span class="cmd-txt"><span>${esc(it.titulo)}</span>${it.sub ? `<small${it.mono ? ' class="mono"' : ''}>${esc(it.sub)}</small>` : ''}</span>
      ${it.chip ? chip(it.chip) : ''}${it.atajo ? `<kbd>${esc(it.atajo)}</kbd>` : ''}<span class="cmd-enter" aria-hidden="true">↵</span></li>`;
  });
  $('cmd-lista').innerHTML = html || `<li class="cmd-vacio" role="presentation">Nada coincide con «${esc($('cmd-q').value.trim())}».</li>`;
  $('cmd-q').setAttribute('aria-activedescendant', cmdItems.length ? `cmd-i-${cmdSel}` : '');
  $('cmd-lista').querySelectorAll('.cmd-item').forEach((li) => {
    li.addEventListener('mousemove', () => { if (cmdSel !== +li.dataset.i) { cmdSel = +li.dataset.i; marcarCmd(); } });
    li.addEventListener('click', () => ejecutarCmd(+li.dataset.i));
  });
}
function marcarCmd() {
  $('cmd-lista').querySelectorAll('.cmd-item').forEach((li) => li.setAttribute('aria-selected', +li.dataset.i === cmdSel));
  $('cmd-q').setAttribute('aria-activedescendant', `cmd-i-${cmdSel}`);
  const el = $(`cmd-i-${cmdSel}`); if (el) el.scrollIntoView({ block: 'nearest' });
}
async function abrirCmd() {
  if (!token || !$('cmd').classList.contains('hidden')) return;
  cmdVolver = document.activeElement;
  $('cmd').classList.remove('hidden');
  $('cmd-q').value = ''; cmdSel = 0;
  pintarCmd(); $('cmd-q').focus();
  try { cmdExp = await api('/api/expedientes'); if (!$('cmd').classList.contains('hidden')) pintarCmd(); } catch (_) { /* la paleta funciona sin la lista */ }
}
function cerrarCmd(devolverFoco = true) {
  $('cmd').classList.add('hidden');
  if (devolverFoco && cmdVolver && document.contains(cmdVolver)) cmdVolver.focus();
}
function ejecutarCmd(i) {
  const it = cmdItems[i]; if (!it) return;
  cerrarCmd(false);
  it.accion();
}
$('cmd-abrir').addEventListener('click', abrirCmd);
$('cmd-q').addEventListener('input', () => { cmdSel = 0; pintarCmd(); });
$('cmd-q').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (cmdItems.length) { cmdSel = (cmdSel + (e.key === 'ArrowDown' ? 1 : -1) + cmdItems.length) % cmdItems.length; marcarCmd(); }
  } else if (e.key === 'Enter') { e.preventDefault(); ejecutarCmd(cmdSel); }
  else if (e.key === 'Escape') { e.preventDefault(); cerrarCmd(); }
  else if (e.key === 'Tab') e.preventDefault();
});
$('cmd').addEventListener('mousedown', (e) => { if (e.target === $('cmd')) cerrarCmd(); });
document.addEventListener('keydown', (e) => {
  const enCampo = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName);
  const sinMod = !e.ctrlKey && !e.metaKey && !e.altKey;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('cmd').classList.contains('hidden') ? abrirCmd() : cerrarCmd(); }
  else if (!enCampo && sinMod && e.key === '/') { e.preventDefault(); abrirCmd(); }
  else if (!enCampo && sinMod && e.key.toLowerCase() === 'n' && token && rol === 'secretario' && $('cmd').classList.contains('hidden')) { e.preventDefault(); nuevoExpediente(); }
});
