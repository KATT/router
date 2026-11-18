import type { PreloadMode, PreloadStrategy } from './types'

// How Links run a `preload` string. Strings the bundler plugin's
// `compilePreloadStrings` rewrote never get here; any other string loads its
// built-in strategy from that strategy's own chunk, so a page loads only the
// strings its Links use.

// Imports a string's chunk; `undefined` for other strings
const importString = (mode: string) =>
  mode === 'intent'
    ? import('./strings/intent')
    : mode === 'viewport'
      ? import('./strings/viewport')
      : mode === 'render'
        ? import('./strings/render')
        : undefined

// Each string's strategy once loaded, else its load, from its first Link
// until the load fails
const modes = new Map<string, PreloadStrategy | Promise<unknown>>()

const load = (mode: string) => {
  let state = modes.get(mode)
  if (!state) {
    state = importString(mode)?.then(
      (module) => modes.set(mode, module.strategy),
      (error) => {
        modes.delete(mode)
        throw error
      },
    )
    if (state) {
      modes.set(mode, state)
    }
  }
  return state
}

/**
 * Loads the strategy a `preload` string stands for (every string's, without
 * one), once per page. Each is its own chunk, so apps load only those they
 * use. If a load fails, the promise rejects and the next call loads again.
 * @experimental
 */
export function loadPreloadStrings(mode?: PreloadMode): Promise<unknown> {
  return Promise.all(
    (mode ? [mode] : (['intent', 'viewport', 'render'] as const)).map(load),
  )
}

// The links waiting on a load that failed warn once for all of them
let failed: unknown

/**
 * The strategy for a `preload` string: `'intent'` is `intentPreload()`,
 * `'viewport'` is `viewportPreload()` and `'render'` is `renderPreload()`.
 * Until it's loaded, the first Link with the string loads it, and a Link that
 * unmounts before that starts nothing. If the load fails, it warns and starts
 * nothing; the next Link with the string that mounts loads again. Other
 * strings are ignored.
 * @experimental
 */
export function preloadString(mode: PreloadMode): PreloadStrategy {
  return (...args) => {
    const pending = load(mode)
    if (typeof pending === 'function') {
      return pending(...args)
    }
    if (!pending) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `Unknown preload mode ${JSON.stringify(mode)}: use 'intent', 'viewport', 'render' or a preload strategy`,
        )
      }
      return undefined
    }
    let active = true
    let cleanup: ReturnType<PreloadStrategy>
    pending.then(
      () => {
        if (active) {
          cleanup = (modes.get(mode) as PreloadStrategy)(...args)
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
