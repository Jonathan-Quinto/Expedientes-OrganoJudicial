import * as React from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertOctagon, KeyRound, Link2, Loader2, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { api, type RegistroAuditoria, type Verificacion } from '@/lib/api'
import { cambioEstado, fechaHora } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/misc'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AccionBadge, Encabezado } from '@/components/comunes'

export function Auditoria() {
  const [params, setParams] = useSearchParams()
  const [reg, setReg] = React.useState<RegistroAuditoria[] | null>(null)
  const [ver, setVer] = React.useState<Verificacion | null>(null)
  const [verificando, setVerificando] = React.useState(false)

  const cargar = React.useCallback(() => api<RegistroAuditoria[]>('/api/auditoria?limite=50').then(setReg).catch(() => setReg([])), [])
  const verificar = React.useCallback(async () => {
    setVerificando(true)
    try { setVer(await api<Verificacion>('/api/auditoria/verificar')); await cargar() } finally { setVerificando(false) }
  }, [cargar])

  React.useEffect(() => { cargar() }, [cargar])
  React.useEffect(() => {
    if (params.get('verificar')) { setParams({}, { replace: true }); verificar() }
  }, [params, setParams, verificar])

  const lista = reg ?? []
  const fallidos = lista.filter((r) => r.accion.endsWith('FALLIDO') || r.accion.endsWith('FALLIDA')).length
  const cambios = lista.filter((r) => r.accion === 'CAMBIAR_ESTADO').length
  const kpis = [
    { t: 'Registros recientes', v: lista.length, i: Link2, c: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { t: 'Cambios de estado', v: cambios, i: KeyRound, c: 'bg-amber-500/12 text-amber-600 dark:text-amber-400' },
    { t: 'Accesos fallidos', v: fallidos, i: ShieldAlert, c: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  ]

  return (
    <div className="space-y-6">
      <Encabezado titulo="Bitácora de auditoría" descripcion="Cada acción queda encadenada con un hash SHA-256 del registro anterior: si alguien altera uno, la cadena se rompe.">
        <Button variant="outline" onClick={cargar}><RefreshCw /> Actualizar</Button>
        <Button onClick={verificar} disabled={verificando}>{verificando ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Verificar integridad</Button>
      </Encabezado>

      {ver && (
        <div role="status" className={cn('flex items-start gap-3 rounded-xl border p-4', ver.integra ? 'border-emerald-500/30 bg-emerald-500/8' : 'border-destructive/40 bg-destructive/8')}>
          {ver.integra ? <ShieldCheck className="mt-0.5 size-5 text-emerald-600 dark:text-emerald-400" /> : <AlertOctagon className="text-destructive mt-0.5 size-5" />}
          <div>
            <p className="font-medium">{ver.integra ? 'Cadena íntegra' : 'Bitácora alterada'}</p>
            <p className="text-muted-foreground text-sm">{ver.integra ? `${ver.registros} registros verificados, ninguno alterado.` : `La cadena se rompe en el registro #${ver.roto_en_id}.`}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map(({ t, v, i: I, c }) => (
          <Card key={t} className="py-4">
            <CardContent className="flex items-center gap-4 px-4">
              <div className={cn('grid size-10 place-items-center rounded-lg', c)}><I className="size-5" /></div>
              <div><div className="text-muted-foreground text-[13px]">{t}</div><div className="text-2xl font-semibold tabular-nums">{reg ? v : '—'}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Cambio</TableHead>
              <TableHead>IP</TableHead>
              <TableHead className="pr-5">Hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!reg && Array.from({ length: 6 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7} className="pl-5"><Skeleton className="h-6" /></TableCell></TableRow>)}
            {lista.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground pl-5 font-mono text-xs">{fechaHora(r.fecha)}</TableCell>
                <TableCell className="font-medium">{r.usuario}</TableCell>
                <TableCell><AccionBadge accion={r.accion} /></TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{r.entidad} #{r.entidad_id}</TableCell>
                <TableCell className="text-[13px]">{cambioEstado(r.antes, r.despues) ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{r.ip || '—'}</TableCell>
                <TableCell className="text-muted-foreground pr-5 font-mono text-xs" title={r.hash}>{r.hash.slice(0, 10)}…</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
