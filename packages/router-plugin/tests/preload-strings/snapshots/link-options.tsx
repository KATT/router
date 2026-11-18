import {
  viewportPreload,
  renderPreload,
  intentPreload,
} from '@tanstack/react-router'
import { Link, createFileRoute, linkOptions } from '@tanstack/react-router'
const postsLink = linkOptions({ to: '/posts', preload: viewportPreload() })
const navLinks = linkOptions([
  { to: '/', preload: renderPreload() },
  { to: '/about', preload: intentPreload() },
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
