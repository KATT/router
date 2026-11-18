import type * as BuiltinsModule from './builtins'
import type { PreloadMode, PreloadStrategy } from './types'

// How Links run a `preload` string. Strings the bundler plugin's
// `compilePreloadStrings` rewrote never get here; any other string loads the
// built-in strategies from their own chunk.

type Builtins = typeof BuiltinsModule

let builtins: Builtins | undefined
let loading: Promise<Builtins> | undefined

/**
 * Loads the strategies the `preload` strings stand for, once per page. They
 * are their own chunk, so apps that don't use the strings don't load them.
 * @experimental
 */
export function loadPreloadStrings(): Promise<unknown> {
  return (loading ??= import('./builtins').then(
    (loaded) => (builtins = loaded),
  ))
}

/**
 * The strategy for a `preload` string: `'intent'` is `intentPreload()`,
 * `'viewport'` is `viewportPreload()` and `'render'` is `renderPreload()`.
 * Until they're loaded, it loads them first, and a Link that unmounts before
 * that starts nothing.
 * @experimental
 */
export function preloadString(mode: PreloadMode): PreloadStrategy {
  return (...args) => {
    if (builtins) {
      return builtins[mode](...args)
    }
    let active = true
    let cleanup: ReturnType<PreloadStrategy>
    loadPreloadStrings().then(() => {
      if (active) {
        cleanup = builtins![mode](...args)
      }
    }, console.warn)
    return () => {
      active = false
      cleanup?.()
    }
  }
}
