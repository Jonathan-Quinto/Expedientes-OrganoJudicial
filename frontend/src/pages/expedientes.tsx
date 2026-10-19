import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, FolderSearch, Plus, Search, X } from 'lucide-react'
import { api, type Estado, type Expediente } from '@/lib/api'
import { ESTADOS, MATERIAS, ORDEN_ESTADOS, fecha, haceCuanto, materia, tituloBandeja } from '@/lib/formato'
import { useSesion } from '@/lib/sesion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/misc'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Encabezado, EstadoBadge, Plazo } from '@/components/comunes'
import { useUi } from '@/components/layout'

const CLAVES = ['q', 'estado', 'materia', 'juez_id', 'plazo_desde', 'plazo_hasta'] as const
const TODOS = '__todos'

export function Expedientes() {
  const { sesion, expedientes: todos, jueces } = useSesion()
  const { abrirNuevo } = useUi()
  const navegar = useNavigate()
  const [params, setParams] = useSearchParams()
  const [lista, setLista] = React.useState<Expediente[] | null>(null)
  const [error, setError] = React.useState('')
  const [texto, setTexto] = React.useState(params.get('q') ?? '')
  const rol = sesion!.rol
  const verJuez = rol === 'secretario' || rol === 'admin'

  const qs = CLAVES.filter((k) => params.get(k) && (k !== 'juez_id' || verJuez)).map((k) => `${k}=${encodeURIComponent(params.get(k)!)}`).join('&')

  React.useEffect(() => {
    const d = params.get('plazo_desde'), h = params.get('plazo_hasta')
    if (d && h && d > h) { setError('La fecha "desde" no puede ser posterior a "hasta".'); setLista([]); return }
    setError('')
    let vivo = true
    api<Expediente[]>(`/api/expedientes${qs ? `?${qs}` : ''}`).then((r) => vivo && setLista(r)).catch((e) => vivo && setError(e.message))
    return () => { vivo = false }
  }, [qs, todos]) // eslint-disable-line react-hooks/exhaustive-deps

  // El texto se aplica con una pequeña espera para no consultar en cada tecla
  React.useEffect(() => {
    const t = setTimeout(() => poner('q', texto.trim()), 250)
    return () => clearTimeout(t)
  }, [texto]) // eslint-disable-line react-hooks/exhaustive-deps

  function poner(k: string, v: string) {
    setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n }, { replace: true })
  }
  const limpiar = () => { setTexto(''); setParams({}, { replace: true }) }
  const activos = CLAVES.filter((k) => k !== 'q' && params.get(k) && (k !== 'juez_id' || verJuez))
  const conteo = (k: Estado | null) => (todos ?? []).filter((e) => !k || e.estado === k).length
  const estadoSel = params.get('estado')
  const etiqueta: Record<string, (v: string) => string> = {
    estado: (v) => `Estado: ${ESTADOS[v as Estado] ?? v}`, materia: (v) => `Materia: ${materia(v)}`,
    juez_id: (v) => `Juez: ${jueces.find((j) => String(j.id) === v)?.nombre ?? v}`, plazo_desde: (v) => `Desde ${fecha(v)}`, plazo_hasta: (v) => `Hasta ${fecha(v)}`,
  }

  return (
    <div className="space-y-5">
      <Encabezado
        titulo={tituloBandeja(rol)}
        descripcion={rol === 'juez' ? 'Solo ves los expedientes asignados a tu despacho.' : rol === 'abogado' ? 'Solo ves los expedientes en los que eres el abogado.' : 'Todos los expedientes del juzgado.'}
      >
        {rol === 'secretario' && <Button className="sm:hidden" onClick={abrirNuevo}><Plus /> Nuevo expediente</Button>}
      </Encabezado>

      {/* Pestañas rápidas por estado */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {[null, ...ORDEN_ESTADOS].map((k) => {
          const on = (estadoSel ?? null) === k
          return (
            <button key={k ?? 'todos'} onClick={() => poner('estado', k ?? '')}
              className={cn('flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors cursor-pointer',
                on ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent')}>
              {k ? ESTADOS[k] : 'Todos'}
              <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', on ? 'bg-background/20' : 'bg-muted')}>{conteo(k)}</span>
            </button>
          )
        })}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input aria-label="Buscar por número o parte" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por número o nombre de una parte" className="pl-9" />
          </div>
          <Select value={params.get('materia') ?? TODOS} onValueChange={(v) => poner('materia', v === TODOS ? '' : v)}>
            <SelectTrigger className="w-[175px]" aria-label="Materia"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas las materias</SelectItem>
              {Object.entries(MATERIAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {verJuez && (
            <Select value={params.get('juez_id') ?? TODOS} onValueChange={(v) => poner('juez_id', v === TODOS ? '' : v)}>
              <SelectTrigger className="w-[190px]" aria-label="Juez"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos los jueces</SelectItem>
                {jueces.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-1.5">
            <Input type="date" aria-label="Plazo desde" className="w-[150px]" value={params.get('plazo_desde') ?? ''} onChange={(e) => poner('plazo_desde', e.target.value)} />
            <span className="text-muted-foreground text-xs">a</span>
            <Input type="date" aria-label="Plazo hasta" className="w-[150px]" value={params.get('plazo_hasta') ?? ''} onChange={(e) => poner('plazo_hasta', e.target.value)} />
          </div>
        </div>
        {(activos.length > 0 || error) && (
          <div className="bg-muted/30 flex flex-wrap items-center gap-2 border-b px-3 py-2">
            {activos.map((k) => (
              <span key={k} className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs font-medium">
                {etiqueta[k](params.get(k)!)}
                <button onClick={() => poner(k, '')} className="hover:bg-primary/15 grid size-5 place-items-center rounded-full cursor-pointer" aria-label={`Quitar ${etiqueta[k](params.get(k)!)}`}><X className="size-3" /></button>
              </span>
            ))}
            {activos.length > 0 && <Button variant="link" size="sm" className="h-6 px-1 text-xs" onClick={limpiar}>Limpiar todo</Button>}
            {error && <span role="alert" className="text-destructive text-xs">{error}</span>}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Expediente</TableHead>
              <TableHead>Materia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Próximo plazo</TableHead>
              <TableHead>Actualizado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista === null && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={6} className="pl-5"><Skeleton className="h-9 w-full" /></TableCell></TableRow>
            ))}
            {lista?.map((e) => (
              <TableRow key={e.id} className="group cursor-pointer" onClick={() => navegar(`/expedientes/${e.id}`)}>
                <TableCell className="pl-5">
                  <div className="font-medium">{e.demandante} <span className="text-muted-foreground font-normal">vs.</span> {e.demandado}</div>
                  <div className="text-muted-foreground font-mono text-xs">{e.numero}</div>
                </TableCell>
                <TableCell><span className="bg-muted rounded-md px-2 py-0.5 text-xs font-medium">{materia(e.materia)}</span></TableCell>
                <TableCell><EstadoBadge estado={e.estado} /></TableCell>
                <TableCell><Plazo e={e} /></TableCell>
                <TableCell className="text-muted-foreground text-[13px]">{haceCuanto(e.actualizado_en)}</TableCell>
                <TableCell className="pr-4">
                  <a href={`/expedientes/${e.id}`} onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); navegar(`/expedientes/${e.id}`) }} aria-label={`Abrir ${e.numero}`}
                    className="text-muted-foreground group-hover:text-foreground grid size-7 place-items-center rounded-md group-hover:bg-accent"><ChevronRight className="size-4" /></a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {lista?.length === 0 && !error && (
          <div className="grid place-items-center gap-3 px-6 py-16 text-center">
            <div className="bg-muted grid size-12 place-items-center rounded-full"><FolderSearch className="text-muted-foreground size-6" /></div>
            <div>
              <p className="font-medium">{qs ? 'Ningún expediente coincide con los filtros' : 'No hay expedientes para mostrar'}</p>
              <p className="text-muted-foreground text-sm">{qs ? 'Prueba con otros criterios o limpia los filtros.' : 'Cuando se registre uno aparecerá aquí.'}</p>
            </div>
            {qs && <Button variant="outline" size="sm" onClick={limpiar}>Limpiar filtros</Button>}
          </div>
        )}
        {lista && lista.length > 0 && (
          <div className="text-muted-foreground border-t px-5 py-2.5 text-xs">{lista.length} de {todos?.length ?? lista.length} expedientes</div>
        )}
      </Card>
    </div>
  )
}
