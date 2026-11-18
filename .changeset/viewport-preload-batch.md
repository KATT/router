---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

`preload` and `defaultPreload` also take a preload strategy. The string modes map to `intentPreload`, `viewportPreload` and `renderPreload`, which can be imported instead. Adds `batchedViewportPreload()`: viewport links share one timer that restarts on every intersection change, scroll and resize, then preload every link still in view in the same tick.
