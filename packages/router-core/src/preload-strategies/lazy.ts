import { intentPreload } from './intent'
import { render } from './render'
import type { PreloadMode, PreloadStrategy } from './types'

// How Links run `'viewport'` and `'render'`. Strings the bundler plugin's
// `compilePreloadStrings` rewrote never get here. `'viewport'` loads its
// strategy from its own chunk, so only pages whose Links use it load it.
// `'render'`'s strategy is a few bytes, less than loading a chunk takes, so
// it's here. A React Link runs `'intent'` itself, through its element's event
// props, so `'intent'` needs neither.

// `'viewport'`'s strategy once loaded, else its load, from its first Link
// until the load fails
let viewport: PreloadStrategy | Promise<PreloadStrategy> | undefined

/**
 * A string's strategy once loaded, else its pending load (`undefined` for
 * other strings). The first call loads it.
 * @internal
 */
export const loadPreloadString = (mode: string) =>
  mode === 'render'
    ? render
    : mode === 'viewport'
      ? (viewport ??= import('./strings/viewport').then(
          (module) => (viewport = module.default),
          // Once per failed load, however many Links wait on it; the next
          // Link with the string loads again
          (error) => {
            viewport = undefined
            console.warn(error)
            throw error
          },
        ))
      : undefined

/**
 * Loads the strategy a `preload` string stands for (every string's, without
 * one), once per page. Only `'viewport'`'s is a chunk of its own, so apps
 * that don't use it don't load it. If a load fails, the promise rejects and
 * the next call loads again.
 * @experimental
 */
export function loadPreloadStrings(mode?: PreloadMode): Promise<unknown> {
  return Promise.all(
    (mode ? [mode] : (['viewport', 'render'] as const)).map(loadPreloadString),
  )
}

/**
 * The strategy for a `preload` string: `'intent'` is `intentPreload()`,
 * `'viewport'` is `viewportPreload()` and `'render'` is `renderPreload()`.
 * Until `'viewport'`'s is loaded, the first Link with it loads it, and a Link
 * that unmounts before that starts nothing. If the load fails, it warns and starts
 * nothing; the next Link with the string that mounts loads again. Other
 * strings are ignored.
 * @experimental
 */
export function preloadString(mode: PreloadMode): PreloadStrategy {
  if (mode === 'intent') {
    return intentPreload()
  }
  return (...args) => {
    const state = loadPreloadString(mode)
    if (typeof state === 'function') {
      return state(...args)
    }
    if (process.env.NODE_ENV !== 'production' && !state) {
      console.warn(
        `Unknown preload mode ${JSON.stringify(mode)}: use 'intent', 'viewport', 'render' or a preload strategy`,
      )
    }
    let active = true
    let cleanup: ReturnType<PreloadStrategy>
    state?.then(
      (strategy) => {
        if (active) {
          cleanup = strategy(...args)
        }
      },
      // The load warned
      () => {},
    )
    return () => {
      active = false
      cleanup?.()
    }
  }
}
