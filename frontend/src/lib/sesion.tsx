import * as React from 'react'
import { api, setToken, type Expediente, type Sesion, type Usuario } from './api'

// Sesión + datos compartidos (expedientes, jueces, abogados). Todo en memoria.
interface Ctx {
  sesion: Sesion | null
  entrar: (s: Sesion) => void
  salir: () => void
  expedientes: Expediente[] | null
  alertas: Expediente[]
  jueces: Usuario[]
  abogados: Usuario[]
  recargar: () => Promise<void>
}
const SesionCtx = React.createContext<Ctx | null>(null)

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = React.useState<Sesion | null>(null)
  const [expedientes, setExpedientes] = React.useState<Expediente[] | null>(null)
  const [alertas, setAlertas] = React.useState<Expediente[]>([])
  const [jueces, setJueces] = React.useState<Usuario[]>([])
  const [abogados, setAbogados] = React.useState<Usuario[]>([])

  const recargar = React.useCallback(async () => {
    const [e, a] = await Promise.all([api<Expediente[]>('/api/expedientes'), api<Expediente[]>('/api/expedientes/alertas')])
    setExpedientes(e)
    setAlertas(a)
  }, [])

  const entrar = React.useCallback((s: Sesion) => {
    setToken(s.token)
    setSesion(s)
    recargar().catch(() => setExpedientes([]))
    if (s.rol === 'secretario' || s.rol === 'admin') {
      api<Usuario[]>('/api/jueces').then(setJueces).catch(() => {})
      api<Usuario[]>('/api/abogados').then(setAbogados).catch(() => {})
    }
  }, [recargar])

  const salir = React.useCallback(() => {
    setToken(null)
    setSesion(null)
    setExpedientes(null)
    setAlertas([]); setJueces([]); setAbogados([])
  }, [])

  return (
    <SesionCtx.Provider value={{ sesion, entrar, salir, expedientes, alertas, jueces, abogados, recargar }}>{children}</SesionCtx.Provider>
  )
}

export function useSesion() {
  const c = React.useContext(SesionCtx)
  if (!c) throw new Error('useSesion fuera de SesionProvider')
  return c
}

// ---- Tema claro / oscuro (preferencia guardada solo como comodidad del navegador) ----
export type Tema = 'claro' | 'oscuro' | 'sistema'
const leer = (): Tema => { try { return (localStorage.getItem('tema') as Tema) || 'sistema' } catch { return 'sistema' } }
export function useTema() {
  const [tema, setTema] = React.useState<Tema>(leer)
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const aplicar = () => document.documentElement.classList.toggle('dark', tema === 'oscuro' || (tema === 'sistema' && mq.matches))
    aplicar()
    try { localStorage.setItem('tema', tema) } catch { /* sin almacenamiento */ }
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [tema])
  return [tema, setTema] as const
}
