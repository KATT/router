import * as Router from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = Router.createRouter({
  routeTree,
  defaultPreload: 'intent',
})

export const options = Router.linkOptions({ to: '/', preload: 'viewport' })

const CustomLink = Router.createLink((props: React.ComponentProps<'a'>) => (
  <a {...props} />
))

export function Nav() {
  // Shadows the namespace here: the strategy gets an import of its own
  const Router = 'not the router'
  return <CustomLink to="/" preload="render" title={Router} />
}
