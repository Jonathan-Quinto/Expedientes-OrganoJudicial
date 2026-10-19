import * as React from 'react'
import { ArrowRight, Info, Loader2, Lock, SearchCheck } from 'lucide-react'
import { api, type ApiError, type ConsultaPublica } from '@/lib/api'
import { ESTADOS, ORDEN_ESTADOS, TIPOS, fechaHora, materia } from '@/lib/formato'
import { useTema } from '@/lib/sesion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Campo, Input } from '@/components/ui/form'
import { Escudo, EstadoBadge } from '@/components/comunes'

export function Consulta() {
  useTema()
  const [numero, setNumero] = React.useState('')
  const [codigo, setCodigo] = React.useState('')
  const [res, setRes] = React.useState<ConsultaPublica | null>(null)
  const [error, setError] = React.useState('')
  const [cargando, setCargando] = React.useState(false)

  async function consultar(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setRes(null); setCargando(true)
    try {
      setRes(await api<ConsultaPublica>(`/api/publico/consulta?${new URLSearchParams({ numero: numero.trim(), codigo: codigo.trim() })}`))
    } catch (x) {
      setError((x as ApiError).status === 429 ? (x as ApiError).message : 'Número o código de consulta incorrecto. Revísalos en la boleta que te entregó el juzgado.')
    } finally { setCargando(false) }
  }
  const i = res ? ORDEN_ESTADOS.indexOf(res.estado) : -1

  return (
    <div className="relative min-h-svh overflow-hidden">
      <div className="pointer-events-none absolute -top-48 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500/20 via-indigo-500/15 to-sky-400/20 blur-3xl" />
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-md shadow-blue-600/25"><Escudo className="size-5" /></div>
          <div className="leading-tight"><div className="text-sm font-semibold">Expediente Judicial Digital</div><div className="text-muted-foreground text-[11px]">Órgano Judicial · Panamá</div></div>
        </div>
        <Button variant="ghost" size="sm" asChild><a href="/"><Lock /> Acceso funcionarios</a></Button>
      </header>

      <main className="relative mx-auto grid max-w-xl gap-8 px-6 pt-10 pb-20">
        <div className="space-y-3 text-center">
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"><SearchCheck className="size-3.5" /> Consulta pública</span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">¿En qué estado está mi proceso?</h1>
          <p className="text-muted-foreground">Ingresa el número de expediente y el código de consulta que te entregó el juzgado.</p>
        </div>

        <Card className="shadow-lg">
          <CardContent>
            <form onSubmit={consultar} className="grid gap-4">
              <Campo label="Número de expediente" htmlFor="numero">
                <Input id="numero" className="h-10 font-mono" placeholder="EXP-2026-000001" value={numero} onChange={(e) => setNumero(e.target.value)} required />
              </Campo>
              <Campo label="Código de consulta" htmlFor="codigo">
                <Input id="codigo" className="h-10 font-mono tracking-widest uppercase" placeholder="8 caracteres" maxLength={8} value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
              </Campo>
              {error && <p role="alert" className="text-destructive bg-destructive/8 rounded-md px-3 py-2 text-sm">{error}</p>}
              <Button type="submit" size="lg" disabled={cargando}>{cargando && <Loader2 className="animate-spin" />} Consultar <ArrowRight /></Button>
            </form>
          </CardContent>
        </Card>

        {res && (
          <Card role="status" className="animate-in fade-in-0 slide-in-from-bottom-2">
            <CardContent className="grid gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><div className="font-mono text-sm">{res.numero}</div><div className="text-muted-foreground text-sm">{materia(res.materia)}</div></div>
                <EstadoBadge estado={res.estado} className="px-3 py-1 text-sm" />
              </div>
              <ol className="grid grid-cols-5 gap-2">
                {ORDEN_ESTADOS.map((k, j) => (
                  <li key={k} className="grid gap-1.5">
                    <span className={cn('h-1.5 rounded-full', j <= i ? 'bg-primary' : 'bg-muted')} />
                    <span className={cn('text-[11px] leading-tight', j === i ? 'font-medium' : 'text-muted-foreground')}>{ESTADOS[k]}</span>
                  </li>
                ))}
              </ol>
              <div className="text-muted-foreground grid gap-1 border-t pt-4 text-sm">
                <span>Última actuación: <span className="text-foreground">{res.ultima_actuacion ? TIPOS[res.ultima_actuacion] ?? res.ultima_actuacion : '—'}</span></span>
                <span>Actualizado: <span className="text-foreground">{fechaHora(res.actualizado_en)}</span></span>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-muted-foreground flex items-start justify-center gap-2 text-center text-xs"><Info className="mt-0.5 size-3.5 shrink-0" /> Por privacidad, la consulta pública muestra solo el estado del proceso, sin nombres ni actuaciones.</p>
      </main>
    </div>
  )
}
