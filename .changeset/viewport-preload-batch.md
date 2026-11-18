---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

`preload` and `defaultPreload` also take a preload strategy. The string modes are `intentPreload()`, `viewportPreload()` and `renderPreload()` with default options; import them to set `delay` or `rootMargin`. Adds `batchedViewportPreload()`, where viewport links share one timer per router that restarts on every intersection change, scroll and resize, then preload every link still in view in the same tick. Adds `preloadStrategyDefaults`, router-wide options given as configured strategies and matched by the factory each strategy carries as its tag, and `createPreloadStrategy` for your own, which take router defaults the same way. All of these are experimental.
