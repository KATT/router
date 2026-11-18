import * as React from 'react'
import { cn } from '~/utils/utils'

const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
}

export function Button({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'button'> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn(
        'inline-flex h-8 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
