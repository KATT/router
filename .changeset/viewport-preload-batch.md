---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

In React, `preload` and `defaultPreload` also take a preload strategy. `intentPreload()`, `viewportPreload()` and `renderPreload()` work like the strings and take `delay` or `rootMargin`. Adds `batchedViewportPreload()`, where viewport links share one timer per router that restarts on every intersection change, scroll and resize, then preload every link still in view in the same tick. Adds `createPreloadStrategy` for your own. React Links no longer ship preload code for the strings: the first Link that uses `'intent'`, `'viewport'` or `'render'` loads the built-in strategies as a separate chunk (`loadPreloadStrategy`), and Links start them once it has loaded.
