import {
  Link,
  RouterProvider,
  createRouter,
  linkOptions,
  useLinkProps,
} from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  defaultPreload: 'viewport',
})

export const options = linkOptions({ to: '/posts', preload: 'render' })

export function App() {
  return <RouterProvider router={router} defaultPreload="viewport" />
}

export function Nav() {
  const props = useLinkProps({ to: '/about', preload: 'viewport' })
  return (
    <nav>
      <a {...props} />
      <Link to="/" preload="viewport" />
      {/* No options for 'intent': it's called without any */}
      <Link to="/posts" preload="intent" />
    </nav>
  )
}
