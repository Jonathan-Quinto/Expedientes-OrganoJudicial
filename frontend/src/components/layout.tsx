import * as React from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import * as Popover from '@radix-ui/react-popover'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  ArrowRight, Bell, FileText, Filter, FolderOpen, Gavel, Globe, LayoutDashboard, LogOut, Menu, Monitor, Moon, PenLine, Plus, Search, ShieldCheck, Sun, X,
} from 'lucide-react'
import { useSesion, useTema, type Tema } from '@/lib/sesion'
import { ESTADOS, MATERIAS, ROLES, iniciales, isoMasDias, hoyIso, materia, tituloBandeja } from '@/lib/formato'
import type { Estado } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, Kbd, Skeleton, Tooltip } from '@/components/ui/misc'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EstadoBadge, Escudo, Plazo } from '@/components/comunes'
import { NuevoExpediente } from '@/components/nuevo-expediente'

export const ES_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent)
// Las acciones contextuales de la paleta llegan a la página de detalle como evento.
export type AccionCmd = { tipo: 'estado'; estado: Estado } | { tipo: 'actuacion' } | { tipo: 'auditoria' }
export const emitirAccion = (a: AccionCmd) => window.dispatchEvent(new CustomEvent<AccionCmd>('cmd-accion', { detail: a }))

const UiCtx = React.createContext<{ abrirPaleta: () => void; abrirNuevo: () => void }>({ abrirPaleta: () => {}, abrirNuevo: () => {} })
export const useUi = () => React.useContext(UiCtx)

function Navegacion({ alNavegar }: { alNavegar?: () => void }) {
  const { sesion, alertas } = useSesion()
  if (!sesion) return null
  const items = [
    { to: '/', icono: LayoutDashboard, texto: 'Inicio', fin: true },
    { to: '/expedientes', icono: FolderOpen, texto: tituloBandeja(sesion.rol), extra: alertas.length || undefined },
    ...(sesion.rol === 'admin' ? [{ to: '/auditoria', icono: ShieldCheck, texto: 'Bitácora de auditoría' }] : []),
  ]
  return (
    <nav className="grid gap-0.5" aria-label="Secciones">
      {items.map(({ to, icono: Icono, texto, fin, extra }) => (
        <NavLink
          key={to}
          to={to}
          end={fin}
          onClick={alNavegar}
          className={({ isActive }) =>
            cn(
              'group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-card text-foreground shadow-xs ring-1 ring-border' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icono className={cn('size-4', isActive && 'text-primary')} />
              <span className="flex-1">{texto}</span>
              {extra && <span className="bg-warning/15 text-warning rounded-full px-1.5 text-[11px] font-semibold tabular-nums" title="Plazos por vencer">{extra}</span>}
            </>
          )}
        </NavLink>
      ))}
      <a href="/consulta" target="_blank" rel="noopener" className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium">
        <Globe className="size-4" /> <span className="flex-1">Consulta ciudadana</span> <ArrowRight className="size-3.5 -rotate-45 opacity-60" />
      </a>
    </nav>
  )
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 text-white shadow-md shadow-blue-600/25">
        <Escudo className="size-5" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">Expediente Judicial</div>
        <div className="text-muted-foreground text-[11px]">Órgano Judicial · Panamá</div>
      </div>
    </div>
  )
}

function MenuUsuario({ tema, setTema }: { tema: Tema; setTema: (t: Tema) => void }) {
  const { sesion, salir } = useSesion()
  const navegar = useNavigate()
  if (!sesion) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-accent flex w-full items-center gap-2.5 rounded-lg p-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-pointer">
        <Avatar>{iniciales(sesion.nombre)}</Avatar>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-medium">{sesion.nombre}</div>
          <div className="text-muted-foreground truncate text-xs">{ROLES[sesion.rol]}</div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">Apariencia</DropdownMenuLabel>
        {([['claro', Sun, 'Claro'], ['oscuro', Moon, 'Oscuro'], ['sistema', Monitor, 'Según el sistema']] as const).map(([t, I, txt]) => (
          <DropdownMenuItem key={t} onSelect={() => setTema(t)}>
            <I /> {txt} {tema === t && <span className="text-primary ml-auto text-xs">●</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => { salir(); navegar('/') }}><LogOut /> Cerrar sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Alertas() {
  const { alertas } = useSesion()
  const navegar = useNavigate()
  return (
    <Popover.Root>
      <Tooltip label="Plazos por vencer">
        <Popover.Trigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label={`Plazos por vencer: ${alertas.length}`}>
            <Bell />
            {alertas.length > 0 && <span className="bg-destructive ring-background absolute top-1.5 right-1.5 size-2 rounded-full ring-2" />}
          </Button>
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="bg-popover data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-50 w-80 rounded-xl border p-0 shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Plazos por vencer</span>
            <span className="text-muted-foreground text-xs">{alertas.length}</span>
          </div>
          <div className="max-h-80 overflow-y-auto p-1.5">
            {alertas.length === 0 && <p className="text-muted-foreground px-3 py-6 text-center text-sm">No hay plazos próximos.</p>}
            {alertas.map((e) => (
              <Popover.Close asChild key={e.id}>
                <button className="hover:bg-accent grid w-full gap-0.5 rounded-lg px-3 py-2 text-left cursor-pointer" onClick={() => navegar(`/expedientes/${e.id}`)}>
                  <span className="truncate text-sm font-medium">{e.demandante} vs. {e.demandado}</span>
                  <span className="flex items-center justify-between gap-2"><span className="text-muted-foreground font-mono text-xs">{e.numero}</span><Plazo e={e} className="text-xs" /></span>
                </button>
              </Popover.Close>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function Paleta({ open, setOpen, abrirNuevo, setTema }: { open: boolean; setOpen: (o: boolean) => void; abrirNuevo: () => void; setTema: (t: Tema) => void }) {
  const { sesion, expedientes, salir } = useSesion()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  if (!sesion) return null
  const rol = sesion.rol
  const idActual = pathname.match(/^\/expedientes\/(\d+)/)?.[1]
  const actual = idActual ? expedientes?.find((e) => String(e.id) === idActual) : undefined
  const correr = (fn: () => void) => () => { setOpen(false); setTimeout(fn, 0) }
  const filtrar = (qs: string) => correr(() => navegar(`/expedientes${qs}`))
  const Sub = ({ children }: { children: React.ReactNode }) => <span className="sub text-muted-foreground ml-auto text-xs">{children}</span>

  return (
    <CommandDialog open={open} onOpenChange={setOpen} label="Barra de comandos">
      <CommandInput placeholder="Busca un expediente, filtra o ejecuta una acción…" />
      <CommandList>
        <CommandEmpty>Nada coincide con tu búsqueda.</CommandEmpty>
        {actual && (
          <CommandGroup heading={`En ${actual.numero}`}>
            {rol === 'juez' &&
              (Object.keys(ESTADOS) as Estado[]).filter((k) => k !== 'radicado' && k !== actual.estado).map((k) => (
                <CommandItem key={k} value={`cambiar estado ${ESTADOS[k]}`} onSelect={correr(() => emitirAccion({ tipo: 'estado', estado: k }))}>
                  <Gavel /> Cambiar estado a {ESTADOS[k]} <Sub>pide el motivo</Sub>
                </CommandItem>
              ))}
            {(rol === 'secretario' || rol === 'abogado') && (
              <CommandItem value="registrar actuacion escrito" onSelect={correr(() => emitirAccion({ tipo: 'actuacion' }))}>
                <PenLine /> {rol === 'abogado' ? 'Registrar escrito' : 'Registrar actuación'}
              </CommandItem>
            )}
            {rol !== 'abogado' && (
              <CommandItem value="ver auditoria del expediente" onSelect={correr(() => emitirAccion({ tipo: 'auditoria' }))}><ShieldCheck /> Ver auditoría de este expediente</CommandItem>
            )}
          </CommandGroup>
        )}
        <CommandGroup heading="Acciones">
          {rol === 'secretario' && (
            <CommandItem value="registrar expediente nuevo crear" onSelect={correr(abrirNuevo)}><Plus /> Registrar expediente nuevo <Kbd className="ml-auto">N</Kbd></CommandItem>
          )}
          {rol === 'admin' && (
            <CommandItem value="verificar integridad bitacora hash" onSelect={correr(() => navegar('/auditoria?verificar=1'))}><ShieldCheck /> Verificar integridad de la bitácora</CommandItem>
          )}
          <CommandItem value="ir a inicio panel resumen" onSelect={correr(() => navegar('/'))}><LayoutDashboard /> Ir a Inicio</CommandItem>
          <CommandItem value={`ir a ${tituloBandeja(rol)} bandeja`} onSelect={correr(() => navegar('/expedientes'))}><FolderOpen /> Ir a {tituloBandeja(rol)}</CommandItem>
          {rol === 'admin' && <CommandItem value="ir a bitacora auditoria" onSelect={correr(() => navegar('/auditoria'))}><ShieldCheck /> Ir a Bitácora de auditoría</CommandItem>}
          <CommandItem value="consulta ciudadana publica" onSelect={correr(() => window.open('/consulta', '_blank', 'noopener'))}><Globe /> Abrir consulta ciudadana <Sub>otra pestaña</Sub></CommandItem>
        </CommandGroup>
        <CommandGroup heading="Expedientes">
          {(expedientes ?? []).map((e) => (
            <CommandItem key={e.id} value={`${e.numero} ${e.demandante} ${e.demandado} ${materia(e.materia)} ${ESTADOS[e.estado]}`} onSelect={correr(() => navegar(`/expedientes/${e.id}`))}>
              <FileText />
              <div className="min-w-0 flex-1">
                <div className="truncate">{e.demandante} vs. {e.demandado}</div>
                <div className="sub text-muted-foreground font-mono text-xs">{e.numero} · {materia(e.materia)}</div>
              </div>
              <EstadoBadge estado={e.estado} className="bg-background/80" />
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Filtrar">
          {(Object.keys(ESTADOS) as Estado[]).map((k) => (
            <CommandItem key={k} value={`filtrar estado ${ESTADOS[k]}`} onSelect={filtrar(`?estado=${k}`)}><Filter /> Estado: {ESTADOS[k]}</CommandItem>
          ))}
          {Object.entries(MATERIAS).map(([k, v]) => (
            <CommandItem key={k} value={`filtrar materia ${v}`} onSelect={filtrar(`?materia=${k}`)}><Filter /> Materia: {v}</CommandItem>
          ))}
          <CommandItem value="filtrar plazos proximos 7 dias semana vence" onSelect={filtrar(`?plazo_desde=${hoyIso()}&plazo_hasta=${isoMasDias(7)}`)}><Filter /> Plazos de los próximos 7 días</CommandItem>
        </CommandGroup>
        <CommandGroup heading="Preferencias">
          <CommandItem value="tema claro apariencia" onSelect={correr(() => setTema('claro'))}><Sun /> Tema claro</CommandItem>
          <CommandItem value="tema oscuro apariencia modo noche" onSelect={correr(() => setTema('oscuro'))}><Moon /> Tema oscuro</CommandItem>
          <CommandItem value="cerrar sesion salir" onSelect={correr(() => { salir(); navegar('/') })}><LogOut /> Cerrar sesión</CommandItem>
        </CommandGroup>
      </CommandList>
      <div className="text-muted-foreground bg-muted/40 hidden items-center gap-4 border-t px-4 py-2 text-xs sm:flex">
        <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
        <span className="flex items-center gap-1"><Kbd>↵</Kbd> ejecutar</span>
        <span className="flex items-center gap-1"><Kbd>Esc</Kbd> cerrar</span>
      </div>
    </CommandDialog>
  )
}

export function Layout() {
  const { sesion } = useSesion()
  const [tema, setTema] = useTema()
  const [paleta, setPaleta] = React.useState(false)
  const [nuevo, setNuevo] = React.useState(false)
  const [menu, setMenu] = React.useState(false)
  const puedeCrear = sesion?.rol === 'secretario'

  React.useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const enCampo = /^(INPUT|SELECT|TEXTAREA)$/.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable
      const sinMod = !e.ctrlKey && !e.metaKey && !e.altKey
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaleta((o) => !o) }
      else if (!enCampo && sinMod && e.key === '/') { e.preventDefault(); setPaleta(true) }
      else if (!enCampo && sinMod && e.key.toLowerCase() === 'n' && puedeCrear && !document.querySelector('[role=dialog]')) { e.preventDefault(); setNuevo(true) }
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [puedeCrear])

  const lateral = (alNavegar?: () => void) => (
    <div className="flex h-full min-w-0 flex-col gap-6 p-3">
      <div className="pt-1"><Marca /></div>
      <Navegacion alNavegar={alNavegar} />
      <div className="mt-auto grid grid-cols-1 gap-3">
        <div className="text-muted-foreground bg-card rounded-lg border p-3 text-xs leading-relaxed">
          <div className="text-foreground mb-1 flex items-center gap-1.5 font-medium"><ShieldCheck className="text-success size-3.5" /> Bitácora encadenada</div>
          Cada acción queda firmada con SHA-256 del registro anterior.
        </div>
        <MenuUsuario tema={tema} setTema={setTema} />
      </div>
    </div>
  )

  return (
    <UiCtx.Provider value={{ abrirPaleta: () => setPaleta(true), abrirNuevo: () => setNuevo(true) }}>
      <div className="flex min-h-svh">
        <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-svh w-64 shrink-0 border-r lg:block">{lateral()}</aside>

        {/* Menú lateral en celular */}
        <DialogPrimitive.Root open={menu} onOpenChange={setMenu}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40 lg:hidden" />
            <DialogPrimitive.Content aria-describedby={undefined} className="bg-sidebar data-[state=open]:animate-in data-[state=open]:slide-in-from-left fixed inset-y-0 left-0 z-50 w-72 border-r shadow-2xl lg:hidden">
              <DialogPrimitive.Title className="sr-only">Menú</DialogPrimitive.Title>
              <DialogPrimitive.Close className="hover:bg-accent absolute top-4 right-3 rounded-md p-1.5 cursor-pointer" aria-label="Cerrar menú"><X className="size-4" /></DialogPrimitive.Close>
              {lateral(() => setMenu(false))}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="bg-background/80 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-xl sm:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenu(true)} aria-label="Abrir menú"><Menu /></Button>
            <button
              onClick={() => setPaleta(true)}
              className="bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground group flex h-10 min-w-0 flex-1 items-center gap-3 rounded-lg border px-3 text-left text-sm shadow-xs transition-colors sm:max-w-xl cursor-text"
            >
              <Search className="text-primary size-4 shrink-0" />
              <span className="flex-1 truncate">Busca un expediente, filtra o ejecuta una acción…</span>
              <Kbd className="hidden sm:inline-flex">{ES_MAC ? '⌘' : 'Ctrl'} K</Kbd>
            </button>
            <div className="ml-auto flex items-center gap-1">
              <Alertas />
              <Tooltip label={tema === 'oscuro' ? 'Tema claro' : 'Tema oscuro'}>
                <Button variant="ghost" size="icon" onClick={() => setTema(document.documentElement.classList.contains('dark') ? 'claro' : 'oscuro')} aria-label="Cambiar tema">
                  <Sun className="hidden dark:block" /><Moon className="dark:hidden" />
                </Button>
              </Tooltip>
              {puedeCrear && <Button className="ml-2 hidden sm:inline-flex" onClick={() => setNuevo(true)}><Plus /> Nuevo expediente</Button>}
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <React.Suspense fallback={<div className="grid gap-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>}>
              <Outlet />
            </React.Suspense>
          </main>
        </div>
      </div>
      <Paleta open={paleta} setOpen={setPaleta} abrirNuevo={() => setNuevo(true)} setTema={setTema} />
      {puedeCrear && <NuevoExpediente open={nuevo} onOpenChange={setNuevo} />}
    </UiCtx.Provider>
  )
}
