import { Link, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const mode = (localStorage.getItem('preload') ?? 'intent') as 'intent'

export const router = createRouter({
  routeTree,
  defaultPreload: mode,
})

export function Nav({ fast }: { fast: boolean }) {
  const preload = fast ? 'intent' : 'viewport'
  return (
    <>
      <Link to="/a" preload={mode} />
      <Link to="/b" preload={fast ? 'render' : 'viewport'} />
      <Link to="/c" {...{ preload }} />
    </>
  )
}
