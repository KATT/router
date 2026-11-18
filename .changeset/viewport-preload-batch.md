---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

Add `defaultPreloadViewportBatch`. When `true`, delayed viewport preloads share one timer per router that restarts on every intersection change, then preload every link still in view in the same tick.
