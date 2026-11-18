import * as React from 'react'
import { cn } from '~/utils/utils'

export function Badge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'bg-secondary text-secondary-foreground inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium tabular-nums',
        className,
      )}
      {...props}
    />
  )
}
