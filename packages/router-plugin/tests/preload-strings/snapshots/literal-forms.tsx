import {
  Link,
  createRouter,
  linkOptions,
  intentPreload,
  viewportPreload,
  renderPreload,
} from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
declare const props: React.ComponentProps<typeof Link>
export const router = createRouter({
  routeTree,
  defaultPreload: intentPreload(),
})
export const options = linkOptions([
  { to: '/a', preload: viewportPreload() },
  { to: '/b', ['preload']: renderPreload() },
  { to: '/c', [`preload`]: intentPreload() },
  { to: '/d', preload: renderPreload() },
] as const)
export const Nav = () => (
  <>
    <Link {...props} to="/a" preload={intentPreload()} />
    <Link to="/b" preload={viewportPreload()} {...props} />
    <Link to="/c" preload={renderPreload()} />
  </>
)
