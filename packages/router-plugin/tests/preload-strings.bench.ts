/**
 * The cost of `experimental.compilePreloadStrings` per file, as the bundler
 * pays it: the code filter for every module, and the transform for those it
 * lets through. Run with `pnpm vitest bench tests/preload-strings.bench.ts`
 * in this package.
 */
import { describe, test } from 'vitest'
import {
  compilePreloadStrings,
  preloadStringsCodeFilter,
} from '../src/core/preload-strings'

/** A large module of the app's own with no `preload` string */
const largeModule = Array.from(
  { length: 5_000 },
  (_, index) =>
    `export function render${index}(props) {\n  return props.preload ? props.items.map((item) => item.id) : []\n}\n`,
).join('')

/** A module with `preload: 'intent'` that doesn't import the router */
const otherLibraryModule = `import { loadImages } from './images'
${largeModule}
export const images = loadImages({ preload: 'intent', priority: 'high' })
`

/** A typical route file */
const routeModule = `import { Link, createFileRoute, linkOptions } from '@tanstack/react-router'
import { fetchPosts } from '../api'

const postsLink = linkOptions({ to: '/posts', preload: 'intent' })

export const Route = createFileRoute('/')({
  loader: () => fetchPosts(),
  component: Home,
})

function Home() {
  const posts = Route.useLoaderData()
  return (
    <main>
      <nav>
        <Link {...postsLink}>Posts</Link>
        <Link to="/about" preload="viewport">
          About
        </Link>
      </nav>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <Link to="/posts/$id" params={{ id: post.id }} preload="intent">
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
`

const benchOptions = { warmupIterations: 20, time: 1_000, throws: true }

describe('preload strings', () => {
  test('code filter: large module without candidates', async ({ bench }) => {
    await bench('code filter: large module without candidates', () => {
      preloadStringsCodeFilter.test(largeModule)
    }).run(benchOptions)
  })

  test('transform: candidate without a router import', async ({ bench }) => {
    await bench('transform: candidate without a router import', () => {
      compilePreloadStrings({ code: otherLibraryModule, filename: 'images.ts' })
    }).run(benchOptions)
  })

  test('transform: typical route file', async ({ bench }) => {
    await bench('transform: typical route file', () => {
      compilePreloadStrings({ code: routeModule, filename: 'index.tsx' })
    }).run(benchOptions)
  })
})
