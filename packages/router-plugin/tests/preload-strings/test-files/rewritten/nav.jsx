import { Link, linkOptions } from '@tanstack/react-router'

const options = linkOptions({ to: '/', preload: 'render' })

export const Nav = () => (
  <>
    <Link {...options} />
    <Link to="/a" preload="viewport" />
  </>
)
