import { Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

// A server function's data is serialized: it keeps its strings
export const getLinks = createServerFn().handler(() => [
  { to: '/', preload: 'intent' },
  { to: '/about', defaultPreload: 'render' },
])

export const Home = () => <Link to="/" />
