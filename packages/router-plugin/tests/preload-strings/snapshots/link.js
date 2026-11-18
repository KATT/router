import { Link, intentPreload } from '@tanstack/react-router'
export const Nav = () => <Link to="/" preload={intentPreload()} />
