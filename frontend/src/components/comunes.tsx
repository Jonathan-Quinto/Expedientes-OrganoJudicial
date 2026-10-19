import { AlertTriangle, CalendarClock, Clock } from 'lucide-react'
import type { Estado, Expediente } from '@/lib/api'
import { ESTADOS, accion as accionTxt, plazo } from '@/lib/formato'
import { cn } from '@/lib/utils'

// Colores por estado (punto + fondo suave), coherentes en tablas, paleta y gráficos.
export const COLOR_ESTADO: Record<Estado, { punto: string; fondo: string; grafico: string }> = {
  radicado: { punto: 'bg-slate-400', fondo: 'bg-slate-500/10 text-slate-700 dark:text-slate-300', grafico: 'var(--chart-5)' },
  en_tramite: { punto: 'bg-blue-500', fondo: 'bg-blue-500/10 text-blue-700 dark:text-blue-300', grafico: 'var(--chart-1)' },
  en_audiencia: { punto: 'bg-amber-500', fondo: 'bg-amber-500/12 text-amber-700 dark:text-amber-300', grafico: 'var(--chart-3)' },
  con_sentencia: { punto: 'bg-violet-500', fondo: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', grafico: 'var(--chart-4)' },
  archivado: { punto: 'bg-zinc-400', fondo: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400', grafico: 'var(--chart-2)' },
}

export function EstadoBadge({ estado, className }: { estado: Estado; className?: string }) {
  const c = COLOR_ESTADO[estado]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', c.fondo, className)}>
      <span className={cn('size-1.5 rounded-full', c.punto)} />
      {ESTADOS[estado]}
    </span>
  )
}

export function Plazo({ e, className }: { e: Pick<Expediente, 'fecha_limite' | 'estado'>; className?: string }) {
  const p = plazo(e)
  if (p.nivel === 'ninguno') return <span className={cn('text-muted-foreground', className)}>Sin plazo</span>
  const Icono = p.nivel === 'vencido' ? AlertTriangle : p.nivel === 'pronto' ? Clock : CalendarClock
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap',
        p.nivel === 'vencido' && 'text-destructive font-medium',
        p.nivel === 'pronto' && 'text-warning font-medium',
        p.nivel === 'normal' && 'text-muted-foreground',
        className,
      )}
    >
      <Icono className="size-3.5" />
      {p.texto}
    </span>
  )
}

const COLOR_ACCION: Record<string, string> = {
  LOGIN_FALLIDO: 'bg-red-500/10 text-red-700 dark:text-red-300',
  CONSULTA_PUBLICA_FALLIDA: 'bg-red-500/10 text-red-700 dark:text-red-300',
  CAMBIAR_ESTADO: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
  CREAR_EXPEDIENTE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  AGREGAR_ACTUACION: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
}
export function AccionBadge({ accion }: { accion: string }) {
  return (
    <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', COLOR_ACCION[accion] ?? 'bg-muted text-muted-foreground')} title={accion}>
      {accionTxt(accion)}
    </span>
  )
}

export function Escudo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M16 5v22M9 27h14M6 9h20M6 9l-3.5 8h7L6 9zM26 9l-3.5 8h7L26 9z" />
      <path d="M2.5 17a3.5 2 0 0 0 7 0M22.5 17a3.5 2 0 0 0 7 0" />
    </svg>
  )
}

export function Encabezado({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="text-muted-foreground text-sm">{descripcion}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
