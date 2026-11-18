---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

In React, the `preload` strings `'intent'`, `'viewport'` and `'render'` are now their built-in strategies. Links still run `'intent'` (and `intentPreload(options)`) through the element's own event props, so `preventDefault()` in a Link's `onMouseEnter`, `onFocus` or `onTouchStart` still stops it. `'viewport'` and `'render'` load on demand from their own chunk: the first Link with one loads it once per page, and a Link that unmounts first starts nothing. Apps that don't use them no longer ship code for them.
