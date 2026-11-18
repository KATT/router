import { Link } from '@tanstack/react-router'

export const body = JSON.stringify({
  preload: 'intent',
  defaultPreload: 'render',
})

export const Home = () => <Link to="/" />
