---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

Add `defaultPreloadViewportScheduler` and `batchViewportPreloads()`. With the batch scheduler, viewport links share one timer per router that restarts on every intersection change, scroll and resize, then preload every link still in view in the same tick.
