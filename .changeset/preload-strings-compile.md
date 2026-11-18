---
'@tanstack/router-plugin': minor
---

Adds `experimental.compilePreloadStrings` (React only, off by default). It rewrites literal `preload` and `defaultPreload` strings of the router's options in your own files (`<Link>`, `createLink` components, `<RouterProvider>`, `createRouter`, `linkOptions` and `useLinkProps` imported from `@tanstack/react-router`) to imports of their strategies, eg. `<Link preload="intent" />` to `<Link preload={intentPreload()} />`, so they ship in the chunk that uses them instead of loading on demand. It adds the strategies to the file's existing `@tanstack/react-router` import, or after its imports, so module order doesn't change. Strings it can't see, eg. from a variable or a library, still load their strategies on demand.
