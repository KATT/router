import {
  RouterProvider,
  createRouter,
  useLinkProps,
} from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const router = createRouter({ routeTree })

export function Anchor() {
  const props = useLinkProps({ to: '/', preload: 'intent' })
  return <a {...props} />
}

export const App = () => (
  <RouterProvider router={router} defaultPreload="viewport" />
)
