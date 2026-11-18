import type * as BuiltinsModule from './builtins'
import type { PreloadMode, PreloadStrategy } from './types'

// How Links run a `preload` string. Strings the bundler plugin's
// `compilePreloadStrings` rewrote never get here; any other string loads the
// built-in strategies from their own chunk.

type Builtins = typeof BuiltinsModule

let builtins: Builtins | undefined
let loading: Promise<unknown> | undefined

/**
 * Loads the strategies the `preload` strings stand for, once per page. They
 * are their own chunk, so apps that don't use the strings don't load them.
 * If the load fails, the promise rejects and the next call loads again.
 * @experimental
 */
export function loadPreloadStrings(): Promise<unknown> {
  return (loading ??= import('./builtins').then(
    (loaded) => (builtins = loaded),
    (error) => {
      loading = undefined
      throw error
    },
  ))
}

// The links waiting on a load that failed warn once for all of them
let failed: unknown

/**
 * The strategy for a `preload` string: `'intent'` is `intentPreload()`,
 * `'viewport'` is `viewportPreload()` and `'render'` is `renderPreload()`.
 * Until they're loaded, it loads them first, and a Link that unmounts before
 * that starts nothing. If the load fails, it warns and starts nothing; the
 * next Link that mounts loads again. Other strings are ignored.
 * @experimental
 */
export function preloadString(mode: PreloadMode): PreloadStrategy {
  return (...args) => {
    const run = (loaded: Builtins) => {
      const strategy = loaded[mode] as PreloadStrategy | undefined
      if (strategy) {
        return strategy(...args)
      }
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `Unknown preload mode ${JSON.stringify(mode)}: use 'intent', 'viewport', 'render' or a preload strategy`,
        )
      }
      return undefined
    }
    if (builtins) {
      return run(builtins)
    }
    let active = true
    let cleanup: ReturnType<PreloadStrategy>
    const pending = loadPreloadStrings()
    pending.then(
      () => {
        if (active) {
          cleanup = run(builtins!)
        }
      },
      (error) => {
        if (failed !== pending) {
          failed = pending
          console.warn(error)
        }
      },
    )
    return () => {
      active = false
      cleanup?.()
    }
  }
}
