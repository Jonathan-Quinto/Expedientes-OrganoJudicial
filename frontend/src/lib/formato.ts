import type { Estado, Expediente, Rol } from './api'

export const ESTADOS: Record<Estado, string> = {
  radicado: 'Radicado', en_tramite: 'En trámite', en_audiencia: 'En audiencia', con_sentencia: 'Con sentencia', archivado: 'Archivado',
}
export const ORDEN_ESTADOS = Object.keys(ESTADOS) as Estado[]
export const MATERIAS: Record<string, string> = { civil: 'Civil', familia: 'Familia', laboral: 'Laboral', penal: 'Penal' }
export const ROLES: Record<Rol, string> = { secretario: 'Secretario judicial', juez: 'Juez', admin: 'Administrador', abogado: 'Abogado' }
export const TIPOS: Record<string, string> = { radicacion: 'Radicación', cambio_estado: 'Cambio de estado' }
export const ACCIONES: Record<string, string> = {
  CREAR_EXPEDIENTE: 'Creó el expediente', CONSULTAR_EXPEDIENTE: 'Consultó el expediente', CAMBIAR_ESTADO: 'Cambió el estado',
  AGREGAR_ACTUACION: 'Agregó una actuación', LOGIN: 'Inició sesión', LOGIN_OK: 'Inició sesión', LOGIN_FALLIDO: 'Intento de acceso fallido',
  CONSULTA_PUBLICA: 'Consulta pública', CONSULTA_PUBLICA_FALLIDA: 'Consulta pública fallida',
}

export const materia = (m: string) => MATERIAS[m] ?? m
export const accion = (a: string) => ACCIONES[a] ?? a.toLowerCase().replace(/_/g, ' ')
export const tituloBandeja = (rol: Rol) => (rol === 'juez' ? 'Mis expedientes' : rol === 'abogado' ? 'Mis casos' : 'Expedientes')

const p2 = (n: number) => String(n).padStart(2, '0')
export const fecha = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')
export const fechaHora = (iso: string) => {
  const d = new Date(iso)
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}
export const hoyIso = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` }
export const isoMasDias = (n: number) => { const d = new Date(Date.now() + n * 864e5); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` }

export function haceCuanto(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'hace un momento'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  const d = Math.floor(s / 86400)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

export type NivelPlazo = 'vencido' | 'pronto' | 'normal' | 'ninguno'
export function plazo(e: Pick<Expediente, 'fecha_limite' | 'estado'>): { nivel: NivelPlazo; texto: string; dias: number | null } {
  if (!e.fecha_limite) return { nivel: 'ninguno', texto: 'Sin plazo', dias: null }
  if (e.estado === 'con_sentencia' || e.estado === 'archivado') return { nivel: 'normal', texto: fecha(e.fecha_limite), dias: null }
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const dias = Math.round((new Date(e.fecha_limite + 'T00:00:00').getTime() - hoy.getTime()) / 864e5)
  if (dias < 0) return { nivel: 'vencido', texto: `Vencido hace ${-dias} ${-dias === 1 ? 'día' : 'días'}`, dias }
  if (dias === 0) return { nivel: 'pronto', texto: 'Vence hoy', dias }
  if (dias <= 5) return { nivel: 'pronto', texto: `Vence en ${dias} ${dias === 1 ? 'día' : 'días'}`, dias }
  return { nivel: 'normal', texto: fecha(e.fecha_limite), dias }
}

export function cambioEstado(antes: string, despues: string) {
  try {
    const a = JSON.parse(antes || '{}'), d = JSON.parse(despues || '{}')
    if (a.estado || d.estado) return `${ESTADOS[a.estado as Estado] ?? '—'} → ${ESTADOS[d.estado as Estado] ?? '—'}`
  } catch { /* registro sin JSON */ }
  return null
}

export const iniciales = (nombre: string) =>
  nombre.replace(/^(Lcd[oa]\.|Lic\.|Dra?\.|Jueza?)\s+/i, '').split(/\s+/).slice(0, 2).map((x) => x[0] ?? '').join('').toUpperCase()
