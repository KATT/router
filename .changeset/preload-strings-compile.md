---
'@tanstack/router-plugin': minor
'@tanstack/start-plugin-core': minor
---

Adds `experimental.compilePreloadStrings` (React only, off by default). It rewrites literal `preload` and `defaultPreload` strings of the router's options in your own files (`<Link>`, `createLink` components made in the same file, `<RouterProvider>`, `createRouter`, `linkOptions` and `useLinkProps` imported from `@tanstack/react-router`) to imports of their strategies, eg. `<Link preload="intent" />` to `<Link preload={intentPreload()} />`, so they ship in the chunk that uses them instead of loading their own chunk on demand. It adds the strategies to the file's existing `@tanstack/react-router` import, or after its imports, so module order doesn't change.

Instead of `true`, it takes options for the strategies, eg. `{ viewport: { rootMargin: '200px', delay: 100 }, intent: { delay: 0 } }`, which are written into the code at build time (`viewportPreload({ delay: 100, rootMargin: '200px' })`), so they cost nothing at runtime. Only the options each strategy takes are accepted, and the build fails on anything else. Strings the plugin can't see, eg. from a variable or a library, still load their strategy on demand, with its default options.

Set it in `tanstackRouter()`, `tsr.config.json`, or with TanStack Start, in `tanstackStart({ router: { experimental: { compilePreloadStrings } } })`: Start's Vite and Rsbuild plugins pass it on. For this, the router plugin also exports the transform on its own, as `tanStackRouterPreloadStrings` from `@tanstack/router-plugin/vite` and `TanStackRouterPreloadStringsRspack` from `@tanstack/router-plugin/rspack`.
