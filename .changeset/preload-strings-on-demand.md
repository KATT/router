---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

In React, the `preload` strings `'intent'`, `'viewport'` and `'render'` are now their built-in strategies, which Links load on demand from their own chunk: the first Link with a string mode loads it once per page, and a Link that unmounts first starts nothing. Apps that don't use the strings no longer ship code for them. As strategies listen to the element themselves, `preventDefault()` in a Link's `onMouseEnter`, `onFocus` or `onTouchStart` no longer stops an `'intent'` preload.
