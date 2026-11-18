import { Link } from '@tanstack/react-router'
import { MyLink } from './my-link'

// Neither the router's nor made by `createLink` here: it may read the string
function Local({ preload }: { preload: string }) {
  return <Link to="/" title={preload} />
}

export const Nav = () => (
  <>
    <MyLink to="/a" preload="viewport" />
    <Local preload="intent" />
  </>
)
