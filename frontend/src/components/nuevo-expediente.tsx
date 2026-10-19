import * as React from 'react'
import { toast } from 'sonner'
import { Check, Copy, FilePlus2, Loader2 } from 'lucide-react'
import { ApiError, post, type ExpedienteCreado } from '@/lib/api'
import { MATERIAS, hoyIso } from '@/lib/formato'
import { useSesion } from '@/lib/sesion'
import { Button } from '@/components/ui/button'
import { Campo, Input, Textarea } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Errores = Partial<Record<'demandante' | 'demandado' | 'fecha_limite' | 'general', string>>
const VACIO = { materia: 'civil', demandante: '', demandado: '', descripcion: '', juez_id: '', abogado_id: 'ninguno', fecha_limite: '' }

export function NuevoExpediente({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { jueces, abogados, recargar } = useSesion()
  const [f, setF] = React.useState(VACIO)
  const [err, setErr] = React.useState<Errores>({})
  const [enviando, setEnviando] = React.useState(false)
  const [creado, setCreado] = React.useState<ExpedienteCreado | null>(null)
  const [copiado, setCopiado] = React.useState(false)

  React.useEffect(() => {
    if (open) { setF({ ...VACIO, juez_id: jueces[0] ? String(jueces[0].id) : '' }); setErr({}); setCreado(null); setCopiado(false) }
  }, [open, jueces])

  const set = (k: keyof typeof VACIO) => (v: string) => { setF((x) => ({ ...x, [k]: v })); setErr((e) => ({ ...e, [k]: undefined })) }

  function validar(): Errores {
    const e: Errores = {}
    if (f.demandante.trim().length < 3) e.demandante = 'Escribe al menos 3 caracteres.'
    if (f.demandado.trim().length < 3) e.demandado = 'Escribe al menos 3 caracteres.'
    if (f.fecha_limite && f.fecha_limite < hoyIso()) e.fecha_limite = 'El plazo no puede ser una fecha pasada.'
    return e
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validar()
    setErr(e)
    if (Object.keys(e).length) { document.getElementById(`n-${Object.keys(e)[0]}`)?.focus(); return }
    setEnviando(true)
    try {
      const r = await post<ExpedienteCreado>('/api/expedientes', {
        materia: f.materia, demandante: f.demandante.trim(), demandado: f.demandado.trim(), descripcion: f.descripcion.trim(),
        juez_id: f.juez_id ? Number(f.juez_id) : null,
        ...(f.abogado_id !== 'ninguno' ? { abogado_id: Number(f.abogado_id) } : {}),
        ...(f.fecha_limite ? { fecha_limite: f.fecha_limite } : {}),
      })
      setCreado(r)
      toast.success(`Expediente ${r.numero} registrado`)
      recargar()
    } catch (x) {
      const a = x as ApiError
      const e2: Errores = {}
      a.campos?.forEach((c) => {
        const k = String(c.loc.at(-1)) as keyof Errores
        e2[['demandante', 'demandado', 'fecha_limite'].includes(k) ? k : 'general'] = c.msg
      })
      if (!a.campos) e2.general = a.message
      setErr(e2)
    } finally { setEnviando(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {creado ? (
          <div className="grid gap-5 py-2 text-center">
            <div className="bg-success/12 text-success mx-auto grid size-14 place-items-center rounded-full"><Check className="size-7" /></div>
            <DialogHeader className="items-center">
              <DialogTitle>Expediente registrado</DialogTitle>
              <DialogDescription>Entrega este código a las partes para que consulten el estado del proceso.</DialogDescription>
            </DialogHeader>
            <div className="bg-muted/60 grid gap-1 rounded-xl border p-4">
              <span className="text-muted-foreground text-xs">Número</span>
              <span className="font-mono text-sm">{creado.numero}</span>
              <span className="text-muted-foreground mt-2 text-xs">Código de consulta</span>
              <span className="text-primary font-mono text-2xl font-semibold tracking-[0.3em]">{creado.codigo_consulta}</span>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(creado.codigo_consulta).then(() => setCopiado(true)).catch(() => {}) }}>
                {copiado ? <Check /> : <Copy />} {copiado ? 'Copiado' : 'Copiar código'}
              </Button>
              <Button onClick={() => onOpenChange(false)}>Listo</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><FilePlus2 className="text-primary size-5" /> Registrar expediente</DialogTitle>
              <DialogDescription>El expediente nace digital: queda en la bitácora con quién lo creó y cuándo.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Demandante" htmlFor="n-demandante" error={err.demandante}>
                <Input id="n-demandante" autoFocus value={f.demandante} onChange={(e) => set('demandante')(e.target.value)} placeholder="Nombre completo" aria-invalid={!!err.demandante} aria-describedby={err.demandante ? 'n-demandante-error' : undefined} />
              </Campo>
              <Campo label="Demandado" htmlFor="n-demandado" error={err.demandado}>
                <Input id="n-demandado" value={f.demandado} onChange={(e) => set('demandado')(e.target.value)} placeholder="Nombre completo" aria-invalid={!!err.demandado} aria-describedby={err.demandado ? 'n-demandado-error' : undefined} />
              </Campo>
              <Campo label="Materia" htmlFor="n-materia">
                <Select value={f.materia} onValueChange={set('materia')}>
                  <SelectTrigger id="n-materia"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(MATERIAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </Campo>
              <Campo label="Próximo plazo" htmlFor="n-fecha_limite" error={err.fecha_limite} hint="Opcional">
                <Input id="n-fecha_limite" type="date" min={hoyIso()} value={f.fecha_limite} onChange={(e) => set('fecha_limite')(e.target.value)} aria-invalid={!!err.fecha_limite} />
              </Campo>
              <Campo label="Juez asignado" htmlFor="n-juez">
                <Select value={f.juez_id} onValueChange={set('juez_id')}>
                  <SelectTrigger id="n-juez"><SelectValue placeholder="Selecciona un juez" /></SelectTrigger>
                  <SelectContent>{jueces.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </Campo>
              <Campo label="Abogado" htmlFor="n-abogado" hint="Opcional">
                <Select value={f.abogado_id} onValueChange={set('abogado_id')}>
                  <SelectTrigger id="n-abogado"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno">Sin abogado</SelectItem>
                    {abogados.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Descripción" htmlFor="n-descripcion" hint="Opcional" className="sm:col-span-2">
                <Textarea id="n-descripcion" value={f.descripcion} onChange={(e) => set('descripcion')(e.target.value)} placeholder="Resumen de la demanda" rows={3} />
              </Campo>
            </div>
            {err.general && <p role="alert" className="text-destructive bg-destructive/8 rounded-md px-3 py-2 text-sm">{err.general}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={enviando}>{enviando && <Loader2 className="animate-spin" />} Registrar expediente</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
