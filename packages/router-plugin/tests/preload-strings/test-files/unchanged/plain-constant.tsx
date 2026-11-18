import { Link } from '@tanstack/react-router'

// Not passed to a router call: it may be anything's options
export const options = { to: '/', preload: 'viewport' } as const

export const settings = { defaultPreload: 'intent' }

export const Home = () => <Link {...options} />
