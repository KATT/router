---
'@tanstack/router-plugin': minor
'@tanstack/start-plugin-core': minor
---

`experimental.compilePreloadStrings` also takes options for the strategies it rewrites the strings to, eg. `{ viewport: { rootMargin: '200px', delay: 100 }, intent: { delay: 0 } }`, in `tanstackRouter()`, `tsr.config.json` and TanStack Start's `router` options. They're written into the code at build time (`viewportPreload({ delay: 100, rootMargin: '200px' })`), so they cost nothing at runtime. Only JSON values the strategies take are accepted. Strings the plugin can't see still load their strategies with the default options. `tanStackRouterPreloadStrings` and `TanStackRouterPreloadStringsRspack` take the options too.
