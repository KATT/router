---
'@tanstack/router-plugin': minor
---

Adds `experimental.compilePreloadStrings` (React only, off by default). It rewrites literal `preload` and `defaultPreload` strings in your own files to imports of their strategies, eg. `<Link preload="intent" />` to `<Link preload={intentPreload()} />`, so they ship in the chunk that uses them instead of loading on demand.
