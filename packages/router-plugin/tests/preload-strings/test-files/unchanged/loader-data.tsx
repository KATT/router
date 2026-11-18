import { Link, createFileRoute } from '@tanstack/react-router'

// A loader's data is the app's own: it keeps its strings
export const Route = createFileRoute('/')({
  loader: () => ({
    links: [{ to: '/a', preload: 'intent' }],
    video: { preload: 'viewport' },
  }),
  component: () => {
    const { links } = Route.useLoaderData()
    return links.map((link) => <Link key={link.to} to={link.to} />)
  },
})
