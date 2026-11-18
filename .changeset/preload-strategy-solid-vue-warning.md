---
'@tanstack/solid-router': patch
'@tanstack/vue-router': patch
---

Solid and Vue Links don't support preload strategies yet: a Link given one (eg. `preload={batchedViewportPreload()}`, which the shared types allow) doesn't preload, and now warns in development instead of ignoring it silently.
