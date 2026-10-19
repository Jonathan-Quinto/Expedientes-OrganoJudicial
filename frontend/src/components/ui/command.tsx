import * as React from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive className={cn('bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-xl', className)} {...props} />
}

function CommandDialog({ open, onOpenChange, children, label }: { open: boolean; onOpenChange: (o: boolean) => void; children: React.ReactNode; label: string }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30 backdrop-blur-[3px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=open]:slide-in-from-top-2 fixed top-[12vh] left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[640px] -translate-x-1/2 overflow-hidden rounded-xl border shadow-2xl duration-150"
        >
          <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
          <Command loop className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium">
            {children}
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex h-14 items-center gap-3 border-b px-4">
      <Search className="text-muted-foreground size-5 shrink-0" />
      <CommandPrimitive.Input className={cn('placeholder:text-muted-foreground flex h-full w-full bg-transparent text-base outline-hidden', className)} {...props} />
    </div>
  )
}
function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List className={cn('max-h-[min(440px,60vh)] scroll-py-2 overflow-x-hidden overflow-y-auto p-2', className)} {...props} />
}
function CommandEmpty(props: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty className="text-muted-foreground py-10 text-center text-sm" {...props} />
}
const CommandGroup = CommandPrimitive.Group
function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        "data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground [&_svg:not([class*='text-'])]:text-muted-foreground data-[selected=true]:[&_svg]:text-primary-foreground data-[selected=true]:[&_.sub]:text-primary-foreground/75 relative flex cursor-default items-center gap-3 rounded-lg px-2.5 py-2 text-sm outline-hidden select-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem }
