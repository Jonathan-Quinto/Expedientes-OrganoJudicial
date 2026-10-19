import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts'
import { Activity, AlarmClock, ArrowRight, CheckCircle2, FolderOpen, Plus, Scale } from 'lucide-react'
import { api, type RegistroAuditoria } from '@/lib/api'
import { ESTADOS, ORDEN_ESTADOS, ROLES, MATERIAS, haceCuanto, materia, plazo, tituloBandeja } from '@/lib/formato'
import { useSesion } from '@/lib/sesion'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { AccionBadge, COLOR_ESTADO, EstadoBadge, Plazo } from '@/components/comunes'
import { useUi } from '@/components/layout'
import { cn } from '@/lib/utils'

function saludo() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

function Kpi({ titulo, valor, icono: Icono, tono, detalle }: { titulo: string; valor: number | string; icono: typeof Scale; tono: string; detalle: string }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardDescription className="text-[13px] font-medium">{titulo}</CardDescription>
        <CardAction><div className={cn('grid size-8 place-items-center rounded-lg', tono)}><Icono className="size-4" /></div></CardAction>
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-3xl font-semibold tracking-tight tabular-nums">{valor}</div>
        <p className="text-muted-foreground mt-1 text-xs">{detalle}</p>
      </CardContent>
    </Card>
  )
}

export function Inicio() {
  const { sesion, expedientes, alertas } = useSesion()
  const { abrirNuevo } = useUi()
  const navegar = useNavigate()
  const [actividad, setActividad] = React.useState<RegistroAuditoria[] | null>(null)
  const rol = sesion!.rol

  React.useEffect(() => {
    if (rol === 'admin') api<RegistroAuditoria[]>('/api/auditoria?limite=7').then(setActividad).catch(() => setActividad([]))
  }, [rol])

  const lista = expedientes ?? []
  const activos = lista.filter((e) => e.estado === 'en_tramite' || e.estado === 'en_audiencia').length
  const resueltos = lista.filter((e) => e.estado === 'con_sentencia' || e.estado === 'archivado').length
  const vencidos = lista.filter((e) => plazo(e).nivel === 'vencido').length
  const porEstado = ORDEN_ESTADOS.map((k) => ({ clave: k, nombre: ESTADOS[k], valor: lista.filter((e) => e.estado === k).length, color: COLOR_ESTADO[k].grafico }))
  const porMateria = Object.keys(MATERIAS).map((k) => ({ nombre: MATERIAS[k], valor: lista.filter((e) => e.materia === k).length }))
  const proximos = lista.filter((e) => e.fecha_limite && !['con_sentencia', 'archivado'].includes(e.estado)).sort((a, b) => a.fecha_limite!.localeCompare(b.fecha_limite!)).slice(0, 5)
  const recientes = [...lista].sort((a, b) => b.actualizado_en.localeCompare(a.actualizado_en)).slice(0, 5)
  const nombre = sesion!.nombre.split(' ').slice(0, 2).join(' ')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{saludo()}, {nombre}</h1>
          <p className="text-muted-foreground text-sm">{ROLES[rol]} · {rol === 'juez' ? 'Resumen de tu despacho' : rol === 'abogado' ? 'Resumen de tus casos' : 'Resumen del juzgado'}</p>
        </div>
        <div className="flex gap-2">
          {rol === 'secretario' && <Button className="sm:hidden" onClick={abrirNuevo}><Plus /> Nuevo expediente</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {expedientes === null ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-xl" />) : (
          <>
            <Kpi titulo="Expedientes" valor={lista.length} icono={FolderOpen} tono="bg-blue-500/10 text-blue-600 dark:text-blue-400" detalle={rol === 'secretario' || rol === 'admin' ? 'En todo el juzgado' : 'Asignados a ti'} />
            <Kpi titulo="En trámite o audiencia" valor={activos} icono={Activity} tono="bg-violet-500/10 text-violet-600 dark:text-violet-400" detalle={`${lista.length ? Math.round((activos / lista.length) * 100) : 0}% del total`} />
            <Kpi titulo="Plazos por vencer" valor={alertas.length} icono={AlarmClock} tono="bg-amber-500/12 text-amber-600 dark:text-amber-400" detalle={vencidos ? `${vencidos} ya vencido${vencidos > 1 ? 's' : ''}` : 'Ninguno vencido'} />
            <Kpi titulo="Resueltos" valor={resueltos} icono={CheckCircle2} tono="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" detalle="Con sentencia o archivados" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Expedientes por estado</CardTitle>
            <CardDescription>Distribución actual de la carga</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[200px_1fr]">
            <div className="relative mx-auto size-[200px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={porEstado.filter((d) => d.valor)} dataKey="valor" nameKey="nombre" innerRadius={64} outerRadius={92} paddingAngle={3} cornerRadius={4} stroke="none">
                    {porEstado.filter((d) => d.valor).map((d) => <Cell key={d.clave} fill={d.color} />)}
                  </Pie>
                  <RTooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div><div className="text-3xl font-semibold tabular-nums">{lista.length}</div><div className="text-muted-foreground text-xs">expedientes</div></div>
              </div>
            </div>
            <ul className="grid gap-2">
              {porEstado.map((d) => (
                <li key={d.clave}>
                  <button onClick={() => navegar(`/expedientes?estado=${d.clave}`)} className="hover:bg-accent flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-sm cursor-pointer">
                    <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="flex-1 text-left">{d.nombre}</span>
                    <span className="bg-muted h-1.5 w-24 overflow-hidden rounded-full"><span className="block h-full rounded-full" style={{ width: `${lista.length ? (d.valor / lista.length) * 100 : 0}%`, background: d.color }} /></span>
                    <span className="w-6 text-right font-medium tabular-nums">{d.valor}</span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Por materia</CardTitle>
            <CardDescription>Expedientes según el tipo de proceso</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={porMateria} margin={{ left: -24, right: 8, top: 8 }}>
                <XAxis dataKey="nombre" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <RTooltip cursor={{ fill: 'var(--muted)' }} contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="valor" name="Expedientes" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximos plazos</CardTitle>
            <CardDescription>Ordenados por fecha límite</CardDescription>
            <CardAction><Button variant="ghost" size="sm" asChild><Link to="/expedientes">Ver todos <ArrowRight /></Link></Button></CardAction>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-1">
            {proximos.length === 0 && <p className="text-muted-foreground py-6 text-center text-sm">No hay plazos pendientes.</p>}
            {proximos.map((e) => (
              <Link key={e.id} to={`/expedientes/${e.id}`} className="hover:bg-accent -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5">
                <div className={cn('w-1 self-stretch rounded-full', { vencido: 'bg-destructive', pronto: 'bg-warning', normal: 'bg-border', ninguno: 'bg-border' }[plazo(e).nivel])} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{e.demandante} vs. {e.demandado}</div>
                  <div className="text-muted-foreground font-mono text-xs">{e.numero} · {materia(e.materia)}</div>
                </div>
                <Plazo e={e} className="shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{rol === 'admin' ? 'Actividad reciente' : 'Movimientos recientes'}</CardTitle>
            <CardDescription>{rol === 'admin' ? 'Últimos registros de la bitácora' : `Últimos cambios en ${tituloBandeja(rol).toLowerCase()}`}</CardDescription>
            {rol === 'admin' && <CardAction><Button variant="ghost" size="sm" asChild><Link to="/auditoria">Bitácora <ArrowRight /></Link></Button></CardAction>}
          </CardHeader>
          <CardContent>
            <ol className="relative grid grid-cols-1 gap-4 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border">
              {rol === 'admin'
                ? (actividad ?? []).map((r) => (
                    <li key={r.id} className="relative flex items-start gap-3 pl-6">
                      <span className="bg-primary ring-card absolute top-1.5 left-0 size-[11px] rounded-full ring-4" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{r.usuario}</span><AccionBadge accion={r.accion} /></div>
                        <div className="text-muted-foreground text-xs">{r.entidad} #{r.entidad_id} · {haceCuanto(r.fecha)}</div>
                      </div>
                    </li>
                  ))
                : recientes.map((e) => (
                    <li key={e.id} className="relative pl-6">
                      <span className="bg-primary ring-card absolute top-1.5 left-0 size-[11px] rounded-full ring-4" />
                      <Link to={`/expedientes/${e.id}`} className="group flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium group-hover:underline">{e.demandante} vs. {e.demandado}</div>
                          <div className="text-muted-foreground text-xs">{e.numero} · actualizado {haceCuanto(e.actualizado_en)}</div>
                        </div>
                        <EstadoBadge estado={e.estado} />
                      </Link>
                    </li>
                  ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
