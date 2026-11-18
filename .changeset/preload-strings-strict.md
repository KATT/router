---
'@tanstack/router-plugin': minor
'@tanstack/router-core': minor
'@tanstack/react-router': minor
---

Adds `experimental.compilePreloadStrings: 'strict'` (React only). It rewrites literal `preload` strings like `true` does, and promises that every string in the app is such a literal: the plugin then aliases `@tanstack/router-core/preload-string` to a stub, so Links ship no code to load the built-in strategies on demand. A string that reaches a Link at runtime doesn't preload, and warns in development. Works in Vite (build and dev), webpack and Rspack. The plugin now adds the strategies to the file's existing `@tanstack/react-router` import, or after its imports, so module order doesn't change. `intentPreload()`, `viewportPreload()` and `renderPreload()` no longer go through `createPreloadStrategy`, so each is smaller on its own.
