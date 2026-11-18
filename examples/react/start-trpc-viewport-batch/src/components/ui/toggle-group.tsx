import * as React from 'react'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { cn } from '~/utils/utils'

export function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn(
        'bg-card/80 inline-flex items-center gap-0.5 rounded-lg border p-0.5 shadow-xs',
        className,
      )}
      {...props}
    />
  )
}

/** Takes its accent from the nearest `[data-mode]`, which may be itself. */
export function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        'text-muted-foreground hover:bg-mode/10 hover:text-mode-ink focus-visible:ring-mode/60 data-[state=on]:bg-mode data-[state=on]:text-mode-foreground inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 data-[state=on]:shadow-sm',
        className,
      )}
      {...props}
    />
  )
}
