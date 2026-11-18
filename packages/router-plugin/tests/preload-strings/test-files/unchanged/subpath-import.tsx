import { RouterClient } from '@tanstack/react-router/ssr/client'
import { Link } from './link'

export const Home = () => <Link to="/" preload="intent" />
export { RouterClient }
