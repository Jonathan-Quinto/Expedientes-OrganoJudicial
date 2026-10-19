// Cliente de la API del MVP. El token vive solo en memoria: al recargar se vuelve a iniciar sesión.
export type Rol = 'secretario' | 'juez' | 'admin' | 'abogado'
export type Estado = 'radicado' | 'en_tramite' | 'en_audiencia' | 'con_sentencia' | 'archivado'

export interface Sesion { token: string; rol: Rol; nombre: string }
export interface Usuario { id: number; username: string; nombre: string; rol: Rol; activo: boolean }
export interface Expediente {
  id: number; numero: string; materia: string; demandante: string; demandado: string; descripcion: string
  estado: Estado; juez_id: number | null; abogado_id: number | null; fecha_limite: string | null
  creado_en: string; actualizado_en: string
}
export interface Actuacion { id: number; tipo: string; detalle: string; fecha: string; usuario_id: number }
export interface ExpedienteDetalle extends Expediente { actuaciones: Actuacion[] }
export interface ExpedienteCreado extends Expediente { codigo_consulta: string }
export interface RegistroAuditoria {
  id: number; fecha: string; usuario: string; accion: string; entidad: string; entidad_id: string
  expediente_id: number | null; antes: string; despues: string; ip: string; hash: string
}
export interface Verificacion { integra: boolean; registros: number; roto_en_id?: number }
export interface ConsultaPublica { numero: string; materia: string; estado: Estado; actualizado_en: string; ultima_actuacion: string | null }

export class ApiError extends Error {
  campos?: { loc: (string | number)[]; msg: string }[]
  status: number
  constructor(msg: string, status: number) { super(msg); this.status = status }
}

let token: string | null = null
export const setToken = (t: string | null) => { token = t }

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  const data = await r.json().catch(() => null)
  if (!r.ok) {
    const d = data?.detail
    const err = new ApiError(typeof d === 'string' ? d : 'Revisa los datos ingresados.', r.status)
    if (Array.isArray(d)) err.campos = d
    throw err
  }
  return data as T
}

export const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) })
