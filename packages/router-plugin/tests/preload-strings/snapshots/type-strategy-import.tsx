import {
  Link,
  type intentPreload,
  intentPreload as intentPreload2,
  viewportPreload as viewportPreload2,
} from '@tanstack/react-router'
import type { viewportPreload } from '@tanstack/react-router'
// Type imports aren't values: the strategies get imports of their own
export type Strategies = [typeof intentPreload, typeof viewportPreload]
export const Nav = () => (
  <>
    <Link to="/a" preload={intentPreload2()} />
    <Link to="/b" preload={viewportPreload2()} />
  </>
)
