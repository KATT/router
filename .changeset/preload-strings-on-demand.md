---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

In React, the `preload` strings `'intent'`, `'viewport'` and `'render'` are now their built-in strategies. Links still run `'intent'` (and `intentPreload(options)`) through the element's own event props, so `preventDefault()` in a Link's `onMouseEnter`, `onFocus` or `onTouchStart` still stops it. `'viewport'` and `'render'` run their built-in strategies, bundled with the Link.
