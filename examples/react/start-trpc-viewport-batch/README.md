# Viewport preload batching (TanStack Start + tRPC)

A list of posts with infinite scroll. Every card is a `<Link>` to a post whose
loader calls `posts.byId` through tRPC's `httpBatchStreamLink`. The toggle in
the header picks how the post links preload, and the panel on the right logs
every tRPC HTTP request.

The mode is in the URL, e.g. `/?preload=viewport`, so a link picks it; it
defaults to `viewport-batch`. The root route validates `?preload=` with zod
(`validateSearch`) and keeps it on every navigation with
`retainSearchParams(['preload'])`, so the post page and Back keep the mode.
Each post link passes `preload` from the search param instead of relying on
`defaultPreload`, so the server and the browser render the same mode and a new
mode applies without a reload. Switching modes clears the React Query cache,
the router's preload cache and the request log, then navigates to the new
search, so each mode starts from the same empty caches.

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
suspend on them with `fromHandle`. The modes, the search schema and the
mode-to-`preload` mapping are in `src/utils/preload-mode.ts`; the switch is in
`src/components/preload-mode-toggle.tsx`.

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
