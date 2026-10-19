import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import { SesionProvider, useSesion } from '@/lib/sesion'
import { TooltipProvider } from '@/components/ui/misc'
import { Layout } from '@/components/layout'
import { Login } from '@/pages/login'

// Cada página se descarga al abrirla (el panel con gráficos es el más pesado).
const Inicio = lazy(() => import('@/pages/inicio').then((m) => ({ default: m.Inicio })))
const Expedientes = lazy(() => import('@/pages/expedientes').then((m) => ({ default: m.Expedientes })))
const Detalle = lazy(() => import('@/pages/detalle').then((m) => ({ default: m.Detalle })))
const Auditoria = lazy(() => import('@/pages/auditoria').then((m) => ({ default: m.Auditoria })))
const Consulta = lazy(() => import('@/pages/consulta').then((m) => ({ default: m.Consulta })))

function Privado() {
  const { sesion } = useSesion()
  if (!sesion) return <Login />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="expedientes" element={<Expedientes />} />
        <Route path="expedientes/:id" element={<Detalle />} />
        <Route path="auditoria" element={sesion.rol === 'admin' ? <Auditoria /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SesionProvider>
        <TooltipProvider delayDuration={300}>
          <Routes>
            <Route path="/consulta" element={<Suspense fallback={null}><Consulta /></Suspense>} />
            <Route path="/*" element={<Privado />} />
          </Routes>
          <Toaster position="bottom-right" richColors closeButton />
        </TooltipProvider>
      </SesionProvider>
    </BrowserRouter>
  </StrictMode>,
)
