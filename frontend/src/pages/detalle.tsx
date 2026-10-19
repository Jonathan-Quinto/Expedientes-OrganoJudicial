import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Briefcase, CalendarClock, Check, Clock, FileClock, Gavel, Hash, Loader2, PenLine, Scale, ShieldCheck, UserRound } from 'lucide-react'
import { api, post, type ApiError, type Estado, type ExpedienteDetalle, type RegistroAuditoria } from '@/lib/api'
import { ESTADOS, ORDEN_ESTADOS, TIPOS, cambioEstado, fecha, fechaHora, haceCuanto, materia } from '@/lib/formato'
import { useSesion } from '@/lib/sesion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Campo, Input, Textarea } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/misc'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccionBadge, EstadoBadge, Plazo } from '@/components/comunes'
import type { AccionCmd } from '@/components/layout'

function Progreso({ estado }: { estado: Estado }) {
  const i = ORDEN_ESTADOS.indexOf(estado)
  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Avance del proceso">
      {ORDEN_ESTADOS.map((k, j) => (
        <li key={k} className="grid gap-2" aria-current={j === i ? 'step' : undefined}>
          <span className={cn('h-1.5 rounded-full', j <= i ? 'bg-primary' : 'bg-muted', j === i && 'ring-primary/25 ring-4')} />
          <span className={cn('text-[11px] leading-tight sm:text-xs', j === i ? 'text-foreground font-medium' : 'text-muted-foreground')}>{ESTADOS[k]}</span>
        </li>
      ))}
    </ol>
  )
}

function Dato({ icono: Icono, etiqueta, children }: { icono: typeof Hash; etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="bg-muted grid size-8 shrink-0 place-items-center rounded-lg"><Icono className="text-muted-foreground size-4" /></div>
      <div className="min-w-0"><div className="text-muted-foreground text-xs">{etiqueta}</div><div className="truncate text-sm font-medium">{children}</div></div>
    </div>
  )
}

export function Detalle() {
  const { id } = useParams()
  const { sesion, jueces, abogados, recargar } = useSesion()
  const rol = sesion!.rol
  const [exp, setExp] = React.useState<ExpedienteDetalle | null>(null)
  const [error, setError] = React.useState('')
  const [tab, setTab] = React.useState('historial')
  const [aud, setAud] = React.useState<RegistroAuditoria[] | null>(null)
  const [audError, setAudError] = React.useState('')
  const [nuevoEstado, setNuevoEstado] = React.useState<Estado | ''>('')
  const [motivo, setMotivo] = React.useState('')
  const [act, setAct] = React.useState({ tipo: '', detalle: '' })
  const [errAccion, setErrAccion] = React.useState('')
  const [enviando, setEnviando] = React.useState(false)
  const motivoRef = React.useRef<HTMLTextAreaElement>(null)
  const tipoRef = React.useRef<HTMLInputElement>(null)

  const cargar = React.useCallback(async () => {
    try { setExp(await api<ExpedienteDetalle>(`/api/expedientes/${id}`)); setError('') } catch (e) { setError((e as ApiError).message) }
  }, [id])
  React.useEffect(() => { setExp(null); setAud(null); setTab('historial'); cargar() }, [cargar])

  React.useEffect(() => {
    if (tab !== 'auditoria' || aud) return
    api<RegistroAuditoria[]>(`/api/expedientes/${id}/auditoria`).then(setAud).catch((e) => setAudError((e as ApiError).message))
  }, [tab, aud, id])

  // Acciones que llegan desde la barra de comandos
  React.useEffect(() => {
    const h = (ev: Event) => {
      const a = (ev as CustomEvent<AccionCmd>).detail
      if (a.tipo === 'estado') { setNuevoEstado(a.estado); setTimeout(() => motivoRef.current?.focus(), 50) }
      if (a.tipo === 'actuacion') tipoRef.current?.focus()
      if (a.tipo === 'auditoria') setTab('auditoria')
    }
    window.addEventListener('cmd-accion', h)
    return () => window.removeEventListener('cmd-accion', h)
  }, [])

  async function cambiarEstado() {
    setErrAccion('')
    if (!nuevoEstado) { setErrAccion('Elige el nuevo estado.'); return }
    if (motivo.trim().length < 5) { setErrAccion('Escribe el motivo (mínimo 5 caracteres): queda en el expediente y en la bitácora.'); motivoRef.current?.focus(); return }
    setEnviando(true)
    try {
      await post(`/api/expedientes/${id}/estado`, { estado: nuevoEstado, motivo: motivo.trim() })
      toast.success(`Estado cambiado a ${ESTADOS[nuevoEstado]}`)
      setMotivo(''); setNuevoEstado(''); setAud(null)
      await cargar(); recargar()
    } catch (e) { setErrAccion((e as ApiError).message) } finally { setEnviando(false) }
  }

  async function agregarActuacion() {
    setErrAccion('')
    if (act.tipo.trim().length < 3 || act.detalle.trim().length < 3) { setErrAccion('El tipo y el detalle necesitan al menos 3 caracteres.'); tipoRef.current?.focus(); return }
    setEnviando(true)
    try {
      await post(`/api/expedientes/${id}/actuaciones`, { tipo: act.tipo.trim(), detalle: act.detalle.trim() })
      toast.success(rol === 'abogado' ? 'Escrito registrado' : 'Actuación registrada')
      setAct({ tipo: '', detalle: '' }); setAud(null)
      await cargar(); recargar()
    } catch (e) { setErrAccion((e as ApiError).message) } finally { setEnviando(false) }
  }

  if (error) {
    return (
      <div className="grid place-items-center gap-4 py-20 text-center">
        <p className="text-lg font-medium">No se pudo abrir el expediente</p>
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button variant="outline" asChild><Link to="/expedientes"><ArrowLeft /> Volver</Link></Button>
      </div>
    )
  }
  if (!exp) return <div className="space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-28 w-full rounded-xl" /><Skeleton className="h-80 w-full rounded-xl" /></div>

  const juez = jueces.find((j) => j.id === exp.juez_id)?.nombre ?? (rol === 'juez' ? sesion!.nombre : exp.juez_id ? `Juez #${exp.juez_id}` : 'Sin asignar')
  const abogado = abogados.find((a) => a.id === exp.abogado_id)?.nombre ?? (rol === 'abogado' ? sesion!.nombre : exp.abogado_id ? `Abogado #${exp.abogado_id}` : 'Sin abogado')
  const actuaciones = exp.actuaciones.slice().reverse()
  const opciones = ORDEN_ESTADOS.filter((k) => k !== 'radicado' && k !== exp.estado)

  return (
    <div className="space-y-6">
      <Link to="/expedientes" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"><ArrowLeft className="size-4" /> Volver a expedientes</Link>

      <Card>
        <CardContent className="grid gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-primary bg-primary/8 rounded-md px-2 py-0.5 font-mono text-xs font-medium">{exp.numero}</span>
                <EstadoBadge estado={exp.estado} />
                <span className="bg-muted rounded-md px-2 py-0.5 text-xs font-medium">{materia(exp.materia)}</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{exp.demandante} <span className="text-muted-foreground font-normal">vs.</span> {exp.demandado}</h1>
              {exp.descripcion && <p className="text-muted-foreground max-w-3xl text-sm">{exp.descripcion}</p>}
            </div>
            <Plazo e={exp} className="bg-muted/60 rounded-lg border px-3 py-1.5" />
          </div>
          <Progreso estado={exp.estado} />
          <div className="grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <Dato icono={Gavel} etiqueta="Juez asignado">{juez}</Dato>
            <Dato icono={Briefcase} etiqueta="Abogado">{abogado}</Dato>
            <Dato icono={CalendarClock} etiqueta="Próximo plazo">{fecha(exp.fecha_limite)}</Dato>
            <Dato icono={Clock} etiqueta="Última actualización">{haceCuanto(exp.actualizado_en)}</Dato>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <Tabs value={tab} onValueChange={setTab}>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>{tab === 'historial' ? 'Historial del expediente' : 'Auditoría del expediente'}</CardTitle>
                <CardDescription>{tab === 'historial' ? `${actuaciones.length} actuaciones registradas` : 'Quién hizo qué, cuándo y desde dónde'}</CardDescription>
              </div>
              <TabsList>
                <TabsTrigger value="historial"><FileClock /> Historial</TabsTrigger>
                {rol !== 'abogado' && <TabsTrigger value="auditoria"><ShieldCheck /> Auditoría</TabsTrigger>}
              </TabsList>
            </CardHeader>
            <CardContent className="pt-5">
              <TabsContent value="historial">
                <ol className="relative grid gap-6 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
                  {actuaciones.map((a) => (
                    <li key={a.id} className="relative flex gap-4">
                      <div className={cn('ring-card relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4', a.tipo === 'cambio_estado' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : a.tipo === 'radicacion' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-primary/12 text-primary')}>
                        {a.tipo === 'cambio_estado' ? <Gavel className="size-4" /> : a.tipo === 'radicacion' ? <Scale className="size-4" /> : <PenLine className="size-4" />}
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="text-sm font-medium">{TIPOS[a.tipo] ?? a.tipo}</span>
                          <time className="text-muted-foreground text-xs" title={fechaHora(a.fecha)}>{fechaHora(a.fecha)}</time>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-sm break-words">{a.detalle.replace(/[a-z_]+ -> [a-z_]+/g, (m) => m.split(' -> ').map((s) => ESTADOS[s as Estado] ?? s).join(' → '))}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </TabsContent>
              <TabsContent value="auditoria">
                {audError && <p role="alert" className="text-destructive text-sm">{audError}</p>}
                {!aud && !audError && <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>}
                {aud && (
                  <ol className="grid gap-1">
                    {aud.length === 0 && <p className="text-muted-foreground py-6 text-center text-sm">Sin registros de auditoría.</p>}
                    {aud.map((r) => (
                      <li key={r.id} className="hover:bg-muted/50 -mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2.5">
                        <AccionBadge accion={r.accion} />
                        <span className="text-sm font-medium">{r.usuario}</span>
                        {cambioEstado(r.antes, r.despues) && <span className="text-muted-foreground text-sm">{cambioEstado(r.antes, r.despues)}</span>}
                        <span className="text-muted-foreground ml-auto flex items-center gap-3 font-mono text-[11px]">
                          <span>{fechaHora(r.fecha)}</span><span>IP {r.ip || '—'}</span><span title={r.hash}>#{r.hash.slice(0, 8)}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <div className="grid gap-6 lg:sticky lg:top-24">
          {rol === 'juez' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gavel className="text-primary size-4" /> Decisión del juez</CardTitle>
                <CardDescription>El cambio queda en el historial y en la bitácora.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Campo label="Nuevo estado" htmlFor="d-nuevo">
                  <Select value={nuevoEstado} onValueChange={(v) => setNuevoEstado(v as Estado)}>
                    <SelectTrigger id="d-nuevo"><SelectValue placeholder="Selecciona el estado" /></SelectTrigger>
                    <SelectContent>{opciones.map((k) => <SelectItem key={k} value={k}>{ESTADOS[k]}</SelectItem>)}</SelectContent>
                  </Select>
                </Campo>
                <Campo label="Motivo" htmlFor="d-motivo" hint="Obligatorio, mínimo 5 caracteres">
                  <Textarea ref={motivoRef} id="d-motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Se admite la demanda" />
                </Campo>
                {errAccion && <p role="alert" className="text-destructive text-sm">{errAccion}</p>}
                <Button onClick={cambiarEstado} disabled={enviando}>{enviando ? <Loader2 className="animate-spin" /> : <Check />} Cambiar estado</Button>
              </CardContent>
            </Card>
          )}
          {(rol === 'secretario' || rol === 'abogado') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><PenLine className="text-primary size-4" /> {rol === 'abogado' ? 'Registrar escrito' : 'Registrar actuación'}</CardTitle>
                <CardDescription>Se agrega al historial con tu usuario y la hora.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Campo label="Tipo" htmlFor="a-tipo">
                  <Input ref={tipoRef} id="a-tipo" value={act.tipo} onChange={(e) => setAct((x) => ({ ...x, tipo: e.target.value }))} placeholder="Notificación, auto, audiencia…" />
                </Campo>
                <Campo label="Detalle" htmlFor="a-detalle">
                  <Textarea id="a-detalle" rows={3} value={act.detalle} onChange={(e) => setAct((x) => ({ ...x, detalle: e.target.value }))} placeholder="Descripción de la actuación" />
                </Campo>
                {errAccion && <p role="alert" className="text-destructive text-sm">{errAccion}</p>}
                <Button onClick={agregarActuacion} disabled={enviando}>{enviando ? <Loader2 className="animate-spin" /> : <PenLine />} {rol === 'abogado' ? 'Agregar escrito' : 'Agregar actuación'}</Button>
              </CardContent>
            </Card>
          )}
          <Card className="bg-muted/40 gap-3 shadow-none">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><UserRound className="text-muted-foreground size-4" /> Consulta ciudadana</CardTitle></CardHeader>
            <CardContent className="text-muted-foreground text-sm">Las partes consultan el estado con el número de expediente y su código. No ven nombres ni actuaciones.</CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
