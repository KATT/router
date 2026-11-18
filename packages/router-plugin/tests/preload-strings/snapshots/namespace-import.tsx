import * as Router from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { renderPreload } from '@tanstack/react-router'
export const router = Router.createRouter({
  routeTree,
  defaultPreload: Router.intentPreload(),
})
export const options = Router.linkOptions({
  to: '/',
  preload: Router.viewportPreload(),
})
const CustomLink = Router.createLink((props: React.ComponentProps<'a'>) => (
  <a {...props} />
))
export function Nav() {
  // Shadows the namespace here: the strategy gets an import of its own
  const Router = 'not the router'
  return <CustomLink to="/" preload={renderPreload()} title={Router} />
}
