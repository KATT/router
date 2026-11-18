---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

Experimental: `preload` and `defaultPreload` also take a preload strategy. The string modes are `intentPreload()`, `viewportPreload()` and `renderPreload()` with default options; import them to set `delay` or `rootMargin`. Adds `batchedViewportPreload()`, where viewport links share one timer per router that restarts on every intersection change, scroll and resize, then preload every link still in view in the same tick. Adds `defaultPreloadOptions`, router-wide options per strategy as `[preloadDefaults(viewportPreload, { rootMargin: '200px' })]`, and `createPreloadStrategy` for your own, which picks up its `preloadDefaults` with no registering.
