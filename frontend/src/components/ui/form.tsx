// Input, Textarea y Label de shadcn/ui.
import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

const campo =
  'border-input bg-card placeholder:text-muted-foreground/70 w-full min-w-0 rounded-md border px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return <input type={type} data-slot="input" className={cn(campo, 'h-9 py-1', className)} {...props} />
}
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={cn(campo, 'min-h-20 py-2 resize-y', className)} {...props} />
}
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root data-slot="label" className={cn('text-[13px] leading-none font-medium select-none', className)} {...props} />
}
function Campo({ label, error, htmlFor, children, hint, className }: { label: string; error?: string; htmlFor: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p id={`${htmlFor}-error`} role="alert" className="text-destructive text-xs">{error}</p> : hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  )
}

export { Input, Textarea, Label, Campo }
