---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
'@tanstack/solid-router': patch
'@tanstack/vue-router': patch
---

Add the `'viewport-batch'` preload mode. Links share one timer per router that restarts on every intersection change, then preload every link still in view in the same tick. Solid and Vue treat it as `'viewport'` for now.
