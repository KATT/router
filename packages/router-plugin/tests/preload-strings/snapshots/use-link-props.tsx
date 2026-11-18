import {
  RouterProvider,
  createRouter,
  useLinkProps,
  intentPreload,
  viewportPreload,
} from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
const router = createRouter({ routeTree })
export function Anchor() {
  const props = useLinkProps({ to: '/', preload: intentPreload() })
  return <a {...props} />
}
export const App = () => (
  <RouterProvider router={router} defaultPreload={viewportPreload()} />
)
