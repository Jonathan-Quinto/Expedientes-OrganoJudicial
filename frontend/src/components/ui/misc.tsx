// Piezas pequeñas de shadcn/ui: Badge, Separator, Skeleton, Avatar, Tooltip, Kbd.
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center justify-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3', {
  variants: {
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      outline: 'text-foreground',
      destructive: 'border-transparent bg-destructive/12 text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
})
function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

function Separator({ className, orientation = 'horizontal', decorative = true, ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn('bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px', className)}
      {...props}
    />
  )
}

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('bg-muted animate-pulse rounded-md', className)} {...props} />
}

function Avatar({ className, children, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)} {...props}>
      <AvatarPrimitive.Fallback className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-[11px] font-semibold text-white">
        {children}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content sideOffset={6} className="bg-foreground text-background animate-in fade-in-0 zoom-in-95 z-50 rounded-md px-2.5 py-1 text-xs">
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
const TooltipProvider = TooltipPrimitive.Provider

function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return <kbd className={cn('bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-0.5 rounded border px-1.5 font-sans text-[11px] font-medium select-none', className)} {...props} />
}

export { Badge, badgeVariants, Separator, Skeleton, Avatar, Tooltip, TooltipProvider, Kbd }
