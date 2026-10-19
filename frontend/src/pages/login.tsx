import * as React from 'react'
import { ArrowRight, Fingerprint, Globe, Loader2, Lock, ScrollText, User, Users } from 'lucide-react'
import { ApiError, post, type Rol } from '@/lib/api'
import { useSesion, useTema } from '@/lib/sesion'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/form'
import { Escudo } from '@/components/comunes'

const DEMO: [string, string][] = [['secretario1', 'Secretario'], ['juez1', 'Juez'], ['abogado1', 'Abogado'], ['admin1', 'Admin']]

export function Login() {
  const { entrar } = useSesion()
  useTema()
  const [usuario, setUsuario] = React.useState('')
  const [clave, setClave] = React.useState('')
  const [error, setError] = React.useState('')
  const [cargando, setCargando] = React.useState(false)
  const claveRef = React.useRef<HTMLInputElement>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const t = await post<{ access_token: string; rol: Rol; nombre: string }>('/api/auth/login', { username: usuario.trim(), password: clave })
      entrar({ token: t.access_token, rol: t.rol, nombre: t.nombre })
    } catch (x) {
      setError((x as ApiError).message)
    } finally { setCargando(false) }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <div className="relative hidden overflow-hidden bg-[#0b1530] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_30%_20%,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -top-40 -left-32 size-[520px] rounded-full bg-blue-600/40 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-[420px] rounded-full bg-indigo-500/30 blur-[120px]" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur"><Escudo className="size-6" /></div>
          <div className="leading-tight">
            <div className="font-semibold">Expediente Judicial Digital</div>
            <div className="text-xs text-white/60">Órgano Judicial · República de Panamá</div>
          </div>
        </div>
        <div className="relative max-w-lg space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Caso 1 · Congestión judicial
            </span>
            <h1 className="text-5xl leading-[1.05] font-semibold tracking-tight">De papel a<br /><span className="bg-gradient-to-r from-sky-300 to-indigo-300 bg-clip-text text-transparent">evidencia digital.</span></h1>
            <p className="text-lg text-white/70">Cada expediente nace digital. Cada actuación queda registrada con quién, cuándo y qué cambió.</p>
          </div>
          <ul className="grid gap-4">
            {[
              [ScrollText, 'Trazabilidad completa', 'Historial de actuaciones por expediente.'],
              [Users, 'Control por roles', 'Secretaría, juez, abogado y administración ven solo lo suyo.'],
              [Fingerprint, 'Auditoría inalterable', 'Bitácora encadenada con hash SHA-256.'],
            ].map(([I, t, d]) => {
              const Icono = I as typeof ScrollText
              return (
                <li key={t as string} className="flex gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15"><Icono className="size-4 text-sky-300" /></div>
                  <div><div className="font-medium">{t as string}</div><div className="text-sm text-white/60">{d as string}</div></div>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="relative text-xs text-white/40">MVP · Equipo 1 · Ingeniería de Software III</div>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="mb-6 grid size-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-lg shadow-blue-600/30 lg:hidden"><Escudo className="size-6" /></div>
            <h2 className="text-2xl font-semibold tracking-tight">Acceso de funcionarios</h2>
            <p className="text-muted-foreground text-sm">Ingresa con tu usuario institucional.</p>
          </div>
          <form onSubmit={enviar} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="l-user">Usuario</Label>
              <div className="relative">
                <User className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input id="l-user" className="h-10 pl-9" autoComplete="username" autoFocus value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="usuario" required />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="l-pass">Contraseña</Label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input ref={claveRef} id="l-pass" className="h-10 pl-9" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required aria-invalid={!!error} />
              </div>
            </div>
            {error && <p role="alert" className="text-destructive bg-destructive/8 rounded-md px-3 py-2 text-sm">{error}</p>}
            <Button type="submit" size="lg" className="mt-1" disabled={cargando}>
              {cargando ? <Loader2 className="animate-spin" /> : null} Entrar <ArrowRight />
            </Button>
          </form>
          <div className="space-y-2.5">
            <div className="text-muted-foreground flex items-center gap-3 text-xs"><span className="bg-border h-px flex-1" /> Usuarios de demostración <span className="bg-border h-px flex-1" /></div>
            <div className="grid grid-cols-4 gap-2">
              {DEMO.map(([u, r]) => (
                <button key={u} type="button" onClick={() => { setUsuario(u); claveRef.current?.focus() }}
                  className="hover:border-primary/50 hover:bg-accent bg-card rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors cursor-pointer">
                  {r}
                </button>
              ))}
            </div>
          </div>
          <a href="/consulta" className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 text-sm"><Globe className="size-4" /> ¿Eres ciudadano? Consulta tu proceso</a>
        </div>
      </div>
    </div>
  )
}
