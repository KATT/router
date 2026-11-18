import { Link, intentPreload as intent } from '@tanstack/react-router'
import type { viewportPreload as ViewportType } from '@tanstack/react-router'

// Already taken: the import gets another name
const viewportPreload = 'not a strategy'

export function Nav() {
  return (
    <>
      <Link to="/a" preload="intent" />
      <Link to="/b" preload="viewport" title={viewportPreload} />
      <Link to="/c" preload={intent({ delay: 100 })} />
    </>
  )
}

export function Shadowed() {
  // Shadows the import of the strategy here: it gets an import of its own
  const intent = 'not a strategy either'
  return <Link to="/d" preload="intent" title={intent} />
}

export type { ViewportType }
