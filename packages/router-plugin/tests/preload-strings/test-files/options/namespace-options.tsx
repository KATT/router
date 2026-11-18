import * as Router from '@tanstack/react-router'
import { viewportPreload } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = Router.createRouter({
  routeTree,
  defaultPreload: 'viewport',
})

export const options = Router.linkOptions({ to: '/', preload: 'viewport' })

const CustomLink = Router.createLink((props: React.ComponentProps<'a'>) => (
  <a {...props} />
))

export function Nav() {
  return (
    <>
      <CustomLink to="/" preload="viewport" />
      {/* Written by hand: left as it is */}
      <CustomLink to="/" preload={viewportPreload({ delay: 5 })} />
    </>
  )
}
