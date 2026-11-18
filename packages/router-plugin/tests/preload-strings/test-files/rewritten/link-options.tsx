import { Link, createFileRoute, linkOptions } from '@tanstack/react-router'

const postsLink = linkOptions({ to: '/posts', preload: 'viewport' })

const navLinks = linkOptions([
  { to: '/', preload: 'render' },
  { to: '/about', 'preload': 'intent' },
])

export const Route = createFileRoute('/')({
  component: () => (
    <>
      <Link {...postsLink} />
      {navLinks.map((options) => (
        <Link key={options.to} {...options} />
      ))}
    </>
  ),
})
