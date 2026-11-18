import {
  Link,
  RouterProvider,
  createRouter,
  linkOptions,
  useLinkProps,
  intentPreload,
  viewportPreload,
  renderPreload,
} from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
export const router = createRouter({
  routeTree,
  defaultPreload: viewportPreload({ delay: 100, rootMargin: '200px' }),
})
export const options = linkOptions({ to: '/posts', preload: renderPreload() })
export function App() {
  return (
    <RouterProvider
      router={router}
      defaultPreload={viewportPreload({ delay: 100, rootMargin: '200px' })}
    />
  )
}
export function Nav() {
  const props = useLinkProps({
    to: '/about',
    preload: viewportPreload({ delay: 100, rootMargin: '200px' }),
  })
  return (
    <nav>
      <a {...props} />
      <Link
        to="/"
        preload={viewportPreload({ delay: 100, rootMargin: '200px' })}
      />
      {/* No options for 'intent': it's called without any */}
      <Link to="/posts" preload={intentPreload()} />
    </nav>
  )
}
