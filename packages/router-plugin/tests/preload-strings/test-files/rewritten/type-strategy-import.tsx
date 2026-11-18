import { Link, type intentPreload } from '@tanstack/react-router'
import type { viewportPreload } from '@tanstack/react-router'

// Type imports aren't values: the strategies get imports of their own
export type Strategies = [typeof intentPreload, typeof viewportPreload]

export const Nav = () => (
  <>
    <Link to="/a" preload="intent" />
    <Link to="/b" preload="viewport" />
  </>
)
