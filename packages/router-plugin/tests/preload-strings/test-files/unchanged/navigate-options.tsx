import { Link, redirect, useNavigate } from '@tanstack/react-router'

// Navigation options take no preload mode
export function Nav() {
  const navigate = useNavigate()
  return (
    <Link
      to="/"
      onClick={() => navigate({ to: '/a', preload: 'intent' } as never)}
    />
  )
}

export const toLogin = () =>
  redirect({ to: '/login', preload: 'intent' } as never)
