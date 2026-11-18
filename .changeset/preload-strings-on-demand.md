---
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

In React, the `preload` strings `'intent'`, `'viewport'` and `'render'` are now their built-in strategies, and each one loads on demand from its own chunk: the first Link with a string loads that string's strategy once per page, and a Link that unmounts first starts nothing. Apps that don't use the strings no longer ship code for them, and an app that uses one string loads only that one. If a chunk fails to load, the waiting Links warn once and the next Link with that string loads it again. Other values, such as `true` or an unknown string, are ignored, with a warning in development. As strategies listen to the element themselves, `preventDefault()` in a Link's `onMouseEnter`, `onFocus` or `onTouchStart` no longer stops an `'intent'` preload. `loadPreloadStrings()` from `@tanstack/router-core` loads a string's strategy (or all three) ahead of time.
