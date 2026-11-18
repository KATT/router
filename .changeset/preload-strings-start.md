---
'@tanstack/start-plugin-core': minor
'@tanstack/router-plugin': minor
---

TanStack Start's Vite and Rsbuild plugins pass on `router.experimental.compilePreloadStrings` (React only). The router plugin exports the transform on its own for this, as `tanStackRouterPreloadStrings` from `@tanstack/router-plugin/vite` and `TanStackRouterPreloadStringsRspack` from `@tanstack/router-plugin/rspack`.
