import { Link, createRouter, linkOptions } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

declare const props: React.ComponentProps<typeof Link>

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent' satisfies 'intent',
})

export const options = linkOptions([
  { to: '/a', preload: ('viewport')! },
  { to: '/b', ['preload']: 'render' },
  { to: '/c', [`preload`]: `intent` },
  { to: '/d', preload: (('render' as const)) },
] as const)

export const Nav = () => (
  <>
    <Link {...props} to="/a" preload="intent" />
    <Link to="/b" preload="viewport" {...props} />
    <Link to="/c" preload={'render' satisfies string} />
  </>
)
