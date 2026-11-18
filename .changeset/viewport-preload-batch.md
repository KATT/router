---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

Experimental: `preload` and `defaultPreload` also take a preload strategy, a function that runs for each Link. The string modes are `intentPreload()`, `viewportPreload()` and `renderPreload()` with default options; import them to set `delay` or `rootMargin`. Adds `batchedViewportPreload()`, where viewport links share one timer that restarts on every intersection change, scroll and resize, then preload every link still in view in the same tick. Adds `createPreloadStrategy` to make your own strategy factories the same way.
