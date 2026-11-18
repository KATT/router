import { Link } from '@tanstack/react-router'

// A name another scope binds is still free here
export function Elsewhere() {
  const intentPreload = 'not a strategy'
  return intentPreload
}

export const Nav = () => <Link to="/a" preload="intent" />

// A name the site's scope binds isn't
export function Here() {
  const viewportPreload = 'not a strategy'
  return <Link to="/b" preload="viewport" title={viewportPreload} />
}
