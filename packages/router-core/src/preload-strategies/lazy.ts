import type { PreloadMode, PreloadStrategy } from './types'

// How Links run a `preload` string. Strings the bundler plugin's
// `compilePreloadStrings` rewrote never get here; any other string loads its
// built-in strategy from that strategy's own chunk, so a page loads only the
// strings its Links use.

// Each string's strategy once loaded, else its load, from its first Link
// until the load fails. Other strings have none. No prototype: a string such
// as `'toString'` is just another unknown one.
const modes: Record<
  string,
  PreloadStrategy | Promise<PreloadStrategy> | undefined
> = Object.create(null)

const load = (mode: string) =>
  (modes[mode] ??= (
    mode === 'intent'
      ? import('./strings/intent')
      : mode === 'viewport'
        ? import('./strings/viewport')
        : mode === 'render'
          ? import('./strings/render')
          : undefined
  )?.then(
    (module) => (modes[mode] = module.strategy),
    // Once per failed load, however many Links wait on it; the next Link
    // with the string loads again
    (error) => {
      modes[mode] = undefined
      console.warn(error)
      throw error
    },
  ))

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
    const state = load(mode)
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
