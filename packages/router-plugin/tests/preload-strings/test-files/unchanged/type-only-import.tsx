import type { Link, LinkOptions } from '@tanstack/react-router'
import { type createRouter } from '@tanstack/react-router'

export const options: LinkOptions = { to: '/', preload: 'intent' }

export type Props = React.ComponentProps<typeof Link>
export type Create = typeof createRouter
