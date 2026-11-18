---
title: Preloading
---

Preloading in TanStack Router is a way to load a route before the user actually navigates to it. This is useful for routes that are likely to be visited by the user next. For example, if you have a list of posts and the user is likely to click on one of them, you can preload the post route so that it's ready to go when the user clicks on it.

## Supported Preloading Strategies

- Intent
  - Preloading by **"intent"** works by using hover and touch start events on `<Link>` components to preload the dependencies for the destination route.
  - This strategy is useful for preloading routes that the user is likely to visit next.
- Viewport Visibility
  - Preloading by **"viewport**" works by using the Intersection Observer API to preload the dependencies for the destination route when the `<Link>` component is in the viewport.
  - This strategy is useful for preloading routes that are below the fold or off-screen.
- Render
  - Preloading by **"render"** works by preloading the dependencies for the destination route as soon as the `<Link>` component is rendered in the DOM.
  - This strategy is useful for preloading routes that are always needed.

## How long does preloaded data stay in memory?

Successful preloaded loader results can enter the router's in-memory cache with
two independent policies:

- **Freshness defaults to 30 seconds.** Configure it with
  `defaultPreloadStaleTime` or a route's `preloadStaleTime`.
- **The unused retention window defaults to 5 minutes.** Configure it with
  `defaultPreloadGcTime` or a route's `preloadGcTime`. Older unused entries
  are eligible for pruning during a later cache reconciliation.
- **The speculative lane is never promoted into router state.** Navigation
  creates its own presentation and runs its own `beforeLoad` chain. It can reuse
  cached loader data or join a loader that is still in flight.

If you need more control over preloading, caching and/or garbage collection of preloaded data, you should use an external caching library like [TanStack Query](https://tanstack.com/query).

The simplest way to preload routes for your application is to set the `defaultPreload` option to `intent` for your entire router:

<!-- ::start:framework -->

# React

```tsx
import { createRouter } from '@tanstack/react-router'

const router = createRouter({
  // ...
  defaultPreload: 'intent',
})
```

# Solid

```tsx
import { createRouter } from '@tanstack/solid-router'

const router = createRouter({
  // ...
  defaultPreload: 'intent',
})
```

<!-- ::end:framework -->

This will turn on `intent` preloading by default for all `<Link>` components in your application. You can also set the `preload` prop on individual `<Link>` components to override the default behavior.

## Preload Delay

By default, intent focus/hover and viewport preloading start after **50ms**. Pending preloads are cancelled if focus or hover ends, or the link leaves the viewport. Touch intent preloads immediately. You can change this delay by setting the `defaultPreloadDelay` option on your router:

<!-- ::start:framework -->

# React

```tsx
import { createRouter } from '@tanstack/react-router'

const router = createRouter({
  // ...
  defaultPreloadDelay: 100,
})
```

# Solid

```tsx
import { createRouter } from '@tanstack/solid-router'

const router = createRouter({
  // ...
  defaultPreloadDelay: 100,
})
```

<!-- ::end:framework -->

You can also set the `preloadDelay` prop on individual `<Link>` components to override the default behavior on a per-link basis.

### Batching Viewport Preloads

> **Experimental:** Preload strategies are experimental and subject to change.

With `'viewport'`, each link has its own timer, so links that scroll into view at different times preload at different times. In React, `batchedViewportPreload()` is a [preload strategy](#preload-strategies) that shares one timer between links instead:

```tsx
import { batchedViewportPreload, createRouter } from '@tanstack/react-router'

const router = createRouter({
  // ...
  defaultPreload: batchedViewportPreload({ delay: 150 }),
})
```

- A link that enters the viewport is queued. A link that leaves before the flush, or that the Link navigates on with a click, is dropped. A click that doesn't navigate in the same tab (with a modifier key, another button, `target="_blank"`, or a `preventDefault()` in your `onClick`) doesn't drop it.
- Every intersection change, scroll (of the page or any container) and resize restarts the timer, so nothing preloads until the page has settled.
- The timer waits the strategy's own `delay`, else the router's `defaultPreloadDelay`. A link's own `preloadDelay` doesn't change it, since the timer is shared.
- When the timer fires, every queued link preloads in the same tick.

This helps data layers that batch requests per tick, such as tRPC's batch links or DataLoader, send one request per screenful instead of one per link. A link that comes back into view is queued again, and the router's usual staleness rules decide whether its loaders run.

The batch belongs to the router. Every link on it that uses `batchedViewportPreload()` with the same options shares it, whether it's the router's `defaultPreload` or written inline as `<Link preload={batchedViewportPreload()} />`. It listens to the page only while it has links: once the last one unmounts, it stops, and the next link starts it again.

### Preload Strategies

> **Experimental:** Preload strategies are experimental and subject to change.

In React, `preload` and `defaultPreload` also take a strategy, which decides when links preload. Each string works like a built-in strategy with its default options, and you can import the strategy to pass options:

| String       | Strategy                                 |
| ------------ | ---------------------------------------- |
| `'intent'`   | `intentPreload({ delay })`               |
| `'viewport'` | `viewportPreload({ delay, rootMargin })` |
| `'render'`   | `renderPreload()`                        |

Links don't have their own code for the strings: a string loads its strategy on demand. See [Strings Load Their Strategy On Demand](#strings-load-their-strategy-on-demand).

For a delay, a link's own `preloadDelay` wins, then the options passed to the strategy, then `defaultPreloadDelay` (except for `batchedViewportPreload()`, whose shared timer ignores links' own `preloadDelay`). `rootMargin` defaults to `'100px'`.

The same options always give the same strategy, so creating one inline in render is fine. Options are the same when their string, number, boolean and `null` values are, in any key order; `undefined` values don't count, so `intentPreload()`, `intentPreload({})` and `intentPreload({ delay: undefined })` are the same strategy. Options that hold an object or a function give a new strategy on every call, which restarts the Links that use it on every render: create such a strategy once, outside render. To use the same options across the app, create the strategy once and use it everywhere:

```tsx
export const batched = batchedViewportPreload({ delay: 150 })

const router = createRouter({
  // ...
  defaultPreload: batched,
})

// elsewhere
<Link to="/posts" preload={batched} />
```

The built-in strategies are small: they keep no state between links, so they don't go through `createPreloadStrategy`, and an app ships only the ones it imports. Write your own with `createPreloadStrategy`. It's started once per router with the options it's called with, and returns what runs for each link on the client:

```tsx
import { createPreloadStrategy } from '@tanstack/react-router'

// Pointer enter preloads at once, and leaving doesn't cancel it
export const eagerPreload = createPreloadStrategy<{ onTouch?: boolean }>(
  (options) =>
    ({ element, preload }) => {
      if (!element) return
      const events = options.onTouch
        ? ['pointerenter', 'touchstart']
        : ['pointerenter']
      events.forEach((type) => element.addEventListener(type, preload))
      return () =>
        events.forEach((type) => element.removeEventListener(type, preload))
    },
)
```

The router stage is where a strategy reads its options and keeps state its links share. The link stage gets `{ element, key, delay, preload }`: the link's element (`null` until its ref is attached), an object that stays the same for the link's whole life, its own `preloadDelay` and a function that preloads its destination now. It listens to or observes the element itself, with whatever events it needs, and can return a cleanup that runs when the link unmounts or its options change.

### Strings Load Their Strategy On Demand

> **Experimental:** This is experimental and subject to change.

In React, the strings `'intent'`, `'viewport'` and `'render'` are their built-in strategies. Each one is a separate chunk: the first Link with that string that mounts loads it, once per page, and starts its strategy when it's there. A Link that unmounts before then starts nothing. If the chunk fails to load, the Links waiting for it warn once and don't preload, and the next Link with that string that mounts loads it again. Other values, such as `true` or an unknown string, are ignored, with a warning in development. So:

- An app with no preloading, or with imported strategies only, doesn't download the built-ins.
- An app that uses a string downloads only that string's strategy, in a second request after the page loads, and its links start preloading once that's done. An app that uses several strings downloads each one's.

Since strategies listen to the element themselves, a `preventDefault()` in your `onMouseEnter`, `onFocus` or `onTouchStart` handler no longer stops an `'intent'` preload (your handler is still called), and a custom link component made with `createLink` has to pass its `ref` on to the element for `'intent'` to work. If such a component switches to another element, the strategy starts again with the new one. A click still cancels a pending preload only when the Link navigates on it, as before.

#### Rewrite the strings at build time

> **Experimental:** This is experimental and subject to change.

With the bundler plugin, `experimental.compilePreloadStrings` rewrites the strings you write as literals to imports of their strategies, so they're in the chunk that uses them and need no second request:

```ts
// vite.config.ts
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      experimental: { compilePreloadStrings: true },
    }),
    react(),
  ],
})
```

```tsx
// What you write
const router = createRouter({ routeTree, defaultPreload: 'viewport' })
const link = <Link to="/posts" preload="intent" />

// What the plugin compiles it to
import { intentPreload, viewportPreload } from '@tanstack/react-router'
const router = createRouter({ routeTree, defaultPreload: viewportPreload() })
const link = <Link to="/posts" preload={intentPreload()} />
```

- It only rewrites the router's own options, and only literals of the three strings (`'intent'`, `'intent' as const` and the like): the `preload` prop of `<Link>` and of components `createLink` makes in the same file, `<RouterProvider defaultPreload>`, `defaultPreload` in `createRouter({...})`, and `preload` in `linkOptions({...})` (or an array of them) and `useLinkProps({...})`. These must be imported from `@tanstack/react-router`, by name or as a namespace (`Router.createRouter(...)`).
- Everything else keeps its strings: other objects, such as a loader's or a server function's data, elements like `<video>`, member and namespaced names like `<motion.video>` or `<Router.Link>`, and your own wrapper components, such as a `MyLink` imported from another file.
- It looks at your own JavaScript and TypeScript files that import `@tanstack/react-router`, not at `node_modules`, and not at MDX, Vue or HTML files. Files it can't parse are left as they are, for your bundler to report.
- Strings it can't see as literals, such as `preload={mode}`, strings from a library, or options built at run time, still load their strategy on demand. That's why the on-demand chunk is always emitted: the build can't prove that no string reaches a Link.
- It's for React only. Set it in `tanstackRouter()`, `tsr.config.json`, or with TanStack Start, in `tanstackStart({ router: { experimental: { compilePreloadStrings: true } } })`.

Instead of `true`, you can pass options for the strategies the strings are rewritten to. The plugin writes them into the code at build time, so they cost nothing at runtime:

```ts
tanstackRouter({
  target: 'react',
  experimental: {
    compilePreloadStrings: {
      viewport: { rootMargin: '200px', delay: 100 },
      intent: { delay: 0 },
    },
  },
})
```

```tsx
// What you write
const link = <Link to="/posts" preload="viewport" />

// What the plugin compiles it to
const link = (
  <Link
    to="/posts"
    preload={viewportPreload({ delay: 100, rootMargin: '200px' })}
  />
)
```

`intent` takes `delay`, `viewport` takes `delay` and `rootMargin`, and `render` takes none. The values must be finite numbers (`delay`) and strings (`rootMargin`), and the build fails on anything else. A mode without options is rewritten to its strategy without any, as with `true`. The options only reach the strings the plugin rewrites: strings it can't see, such as `preload={mode}`, `<Router.Link>` or a `createLink` component imported from another file, still load their strategy on demand **with its default options**. Where those need the options too, pass the strategy itself, eg. `preload={viewportPreload({ rootMargin: '200px' })}`.

#### Bundle size

Links carry no code for the strings, so the JS every visitor downloads up front (the initial JS) only has the strategies the app imports, with or without the plugin, and is smaller than in versions where Links handled the strings themselves. The on-demand chunk with the built-ins is still emitted to your build output, so the total size of all emitted files grows a little, but a visitor only downloads it when a string the plugin couldn't see reaches a Link.

## Built-in Preloading, Freshness, and Retention

If you're using the built-in loaders, you can control how long preloaded data is considered fresh by setting either `routerOptions.defaultPreloadStaleTime` or `routeOptions.preloadStaleTime` to a number of milliseconds. **By default, preloaded data is considered fresh for 30 seconds.**

Freshness and retention are separate. `preloadStaleTime` controls whether the
retained loader result can be reused without another loader call.
`preloadGcTime` (or `defaultPreloadGcTime`) controls when an unused preload
result becomes eligible for pruning during a later cache reconciliation; it
does not schedule a timer to evict the result at that exact moment. Both preload
GC options default to 5 minutes.

To change this, you can set the `defaultPreloadStaleTime` option on your router:

<!-- ::start:framework -->

# React

```tsx
import { createRouter } from '@tanstack/react-router'

const router = createRouter({
  // ...
  defaultPreloadStaleTime: 10_000,
})
```

# Solid

```tsx
import { createRouter } from '@tanstack/solid-router'

const router = createRouter({
  // ...
  defaultPreloadStaleTime: 10_000,
})
```

<!-- ::end:framework -->

Or, you can use the `routeOptions.preloadStaleTime` option on individual routes:

```tsx
// src/routes/posts.$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => fetchPost(params.postId),
  // Reload preloaded data when it is more than 10 seconds old
  preloadStaleTime: 10_000,
})
```

Client-side preloading runs each route's `beforeLoad` with `preload: true`.
Every later preload or navigation runs its own `beforeLoad` chain, so a
navigation observes `preload: false` even when an identical preload is still
active. A later lane can reuse successful settled loader data or join loader
work that is still in flight, but it never reuses `beforeLoad` context or an
already-settled redirect, error, or not-found result. If joined loader work
later produces a terminal outcome, all current consumers of that flight observe
it. The `shouldReload` option remains loader-only.

If a route has `preload: false`, its speculative lane still runs `beforeLoad`,
but skips that route's loader. Navigation runs `beforeLoad` again and performs
the skipped loader work.

## Preloading with External Libraries

When integrating external caching libraries like React Query, which have their own mechanisms for determining stale data, you may want to override the default preloading and stale-while-revalidate logic of TanStack Router. These libraries often use options like staleTime to control the freshness of data.

To let an external cache make the freshness decision, set
`routerOptions.defaultPreloadStaleTime` or `routeOptions.preloadStaleTime` to
`0`. Settled preload data then becomes immediately stale in the Router, while
retention still follows `preloadGcTime`. Overlapping preload or navigation
consumers can still share in-flight loader work, and `shouldReload` can still
suppress a loader call.

For example:

<!-- ::start:framework -->

# React

```tsx
import { createRouter } from '@tanstack/react-router'

const router = createRouter({
  // ...
  defaultPreloadStaleTime: 0,
})
```

# Solid

```tsx
import { createRouter } from '@tanstack/solid-router'

const router = createRouter({
  // ...
  defaultPreloadStaleTime: 0,
})
```

<!-- ::end:framework -->

This would then allow you, for instance, to use an option like React Query's `staleTime` to control the freshness of your preloads.

## Preloading Manually

If you need to manually preload a route, use the router's `preloadRoute` method.
It accepts a standard TanStack `NavigateOptions` object and returns the
speculative match lane. An ordinary error or not-found thrown while loading is
represented in that returned lane; cancellation or control flow that produces
no reusable lane can return `undefined`.

<!-- ::start:framework -->

# React

```tsx
import { isNotFound } from '@tanstack/react-router'

function Component() {
  const router = useRouter()

  useEffect(() => {
    async function preload() {
      const matches = await router.preloadRoute({
        to: postRoute,
        params: { id: 1 },
      })

      const routeFailure = matches?.find(
        (match) =>
          match.status === 'error' ||
          match.status === 'notFound' ||
          isNotFound(match.error),
      )

      if (routeFailure) {
        // Inspect routeFailure.error
      }
    }

    preload()
  }, [router])

  return <div />
}
```

# Solid

```tsx
import { isNotFound } from '@tanstack/solid-router'

function Component() {
  const router = useRouter()

  createEffect(() => {
    async function preload() {
      const matches = await router.preloadRoute({
        to: postRoute,
        params: { id: 1 },
      })

      const routeFailure = matches?.find(
        (match) =>
          match.status === 'error' ||
          match.status === 'notFound' ||
          isNotFound(match.error),
      )

      if (routeFailure) {
        // Inspect routeFailure.error
      }
    }

    preload()
  })

  return <div />
}
```

<!-- ::end:framework -->

If you need to preload only the JS chunk of a route, you can use the router's `loadRouteChunk` method. It accepts a route object and returns a promise that resolves when the route chunk is loaded.

<!-- ::start:framework -->

# React

```tsx
function Component() {
  const router = useRouter()

  useEffect(() => {
    async function preloadRouteChunks() {
      try {
        const postsRoute = router.routesByPath['/posts']
        await Promise.all([
          router.loadRouteChunk(router.routesByPath['/']),
          router.loadRouteChunk(postsRoute),
          router.loadRouteChunk(postsRoute.parentRoute),
        ])
      } catch (err) {
        // Failed to preload route chunk
      }
    }

    preloadRouteChunks()
  }, [router])

  return <div />
}
```

# Solid

```tsx
function Component() {
  const router = useRouter()

  createEffect(() => {
    async function preloadRouteChunks() {
      try {
        const postsRoute = router.routesByPath['/posts']
        await Promise.all([
          router.loadRouteChunk(router.routesByPath['/']),
          router.loadRouteChunk(postsRoute),
          router.loadRouteChunk(postsRoute.parentRoute),
        ])
      } catch (err) {
        // Failed to preload route chunk
      }
    }

    preloadRouteChunks()
  })

  return <div />
}
```

<!-- ::end:framework -->
