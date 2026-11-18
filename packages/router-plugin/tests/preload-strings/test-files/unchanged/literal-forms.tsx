import { Link, createRouter, linkOptions } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const preload = 'intent'
const mode = 'viewport'

export const router = createRouter({
  routeTree,
  // Not literals of a mode
  defaultPreload: `${mode}`,
})

export const options = linkOptions([
  { to: '/a', preload },
  { to: '/b', preload: false },
  // Search params, not link options
  { to: '/c', search: { preload: 'intent' } },
])

export function Nav({ preload = 'intent' }: { preload?: 'intent' }) {
  return (
    <>
      <Link to="/a" preload />
      <Link to="/b" preload={preload} />
      <Link to="/c" preload="auto" />
    </>
  )
}
