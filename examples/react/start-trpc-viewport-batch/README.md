# Viewport preload batching (TanStack Start + tRPC)

A list of posts with infinite scroll. Every card is a `<Link>` to a post whose
loader calls `posts.byId` through tRPC's `httpBatchStreamLink`. The toggle in
the header sets `defaultPreload` (saved in a cookie, read on the server and the
client), and the panel on the right logs every tRPC HTTP request.

- `off`: nothing preloads.
- `render`: every link preloads when it mounts, one request per page of posts.
- `viewport`: each link preloads on its own timer when it scrolls into view, so
  scrolling sends many small requests.
- `viewport-batch`: router preloading is off, and `useViewportBatchPreload`
  (`src/utils/viewport-preloader.ts`) takes over. One shared
  IntersectionObserver queues links as they enter the viewport and drops them
  as they leave. Every intersection change, scroll and resize restarts a
  150 ms timer, so it only fires once the page has settled. When it fires, every
  queued link calls `router.preloadRoute()` in the same tick, so their loaders'
  tRPC queries go out in one request.

This runs on the current router; it needs no router changes.

Loaders don't wait for data. They start tRPC queries with `loadHandles` and
prefetch entries (`src/trpc/queries.ts`) and return the handles; components
suspend on them with `fromHandle`. The mode-to-router-options mapping is in
`src/utils/preload-mode.ts`.

## Run

From the repository root:

```sh
pnpm install
pnpm nx run tanstack-start-example-trpc-viewport-batch:build
cd examples/react/start-trpc-viewport-batch
pnpm dev
```

## Deploy

`vercel.json` installs and builds from the monorepo root, so set the Vercel
project's root directory to `examples/react/start-trpc-viewport-batch`. Nitro
picks its Vercel preset automatically.
