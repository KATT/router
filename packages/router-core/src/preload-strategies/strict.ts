import type { PreloadMode, PreloadStrategy } from './types'

// `@tanstack/router-core/preload-string/strict`: what the bundler plugin's
// strict mode (`compilePreloadStrings: 'strict'`) puts in place of
// `@tanstack/router-core/preload-string`. The app promised that its `preload`
// strings are literals, which the plugin rewrote to their strategies, so a
// string that reaches a Link does nothing (and warns in development).

const warned = /* @__PURE__ */ new Set<string>()

/** @experimental */
export function loadPreloadStrings(): Promise<unknown> {
  return Promise.resolve()
}

/** @experimental */
export function preloadString(mode: PreloadMode): PreloadStrategy {
  return () => {
    if (process.env.NODE_ENV !== 'production' && !warned.has(mode)) {
      warned.add(mode)
      console.warn(
        `Warning: A Link got preload "${mode}" as a string at runtime, so it doesn't preload. With \`experimental.compilePreloadStrings: 'strict'\`, write preload strings as literals, or import the strategy, eg. \`${mode}Preload()\`.`,
      )
    }
  }
}
