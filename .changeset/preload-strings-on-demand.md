---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

In React, the `preload` strings `'intent'`, `'viewport'` and `'render'` are now their built-in strategies. Links still run `'intent'` (and `intentPreload(options)`) through the element's own event props, so `preventDefault()` in a Link's `onMouseEnter`, `onFocus` or `onTouchStart` still stops it, and `'render'` is bundled with the Link. `'viewport'` loads on demand from its own chunk: the first Link with it loads it once per page, and a Link that unmounts first starts nothing. Apps that don't use `'viewport'` no longer ship code for it.
