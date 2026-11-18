---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

In React, `preload` and `defaultPreload` also take a preload strategy. `intentPreload()`, `viewportPreload()` and `renderPreload()` work like the strings and take `delay` or `rootMargin`. Adds `batchedViewportPreload()`, where viewport links share one timer per router that restarts on every intersection change, scroll and resize, then preload every link still in view in the same tick. Adds `createPreloadStrategy` for your own.
