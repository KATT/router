import type { AnyRouter } from '../router'
import type * as BuiltinsModule from './builtins'
import type { PreloadMode, PreloadStrategy } from './types'

type Builtins = typeof BuiltinsModule

let builtins: Builtins | undefined
let loading: Promise<Builtins> | undefined

/**
 * Loads the built-in strategy a string runs: `'intent'` gives
 * `intentPreload()`, `'viewport'` gives `viewportPreload()` and `'render'`
 * gives `renderPreload()`. They live in their own chunk, imported on the
 * first call; later calls reuse it. A failed import is retried on the next
 * call.
 * @experimental
 */
export function loadPreloadStrategy(
  mode: PreloadMode,
): Promise<PreloadStrategy> {
  loading ??= import('./builtins').then(
    (module) => (builtins = module),
    (error) => {
      loading = undefined
      throw error
    },
  )
  return loading.then((module) => module[mode])
}

/**
 * Starts a Link's `preload` option and returns its cleanup. A strategy starts
 * at once. A string starts its built-in strategy: at once if it has loaded,
 * else once it loads, unless the cleanup ran first. For framework adapters:
 * call it in a client effect and call what it returns on cleanup.
 * @experimental
 */
export function startLinkPreload(
  option: PreloadMode | PreloadStrategy,
  router: AnyRouter,
  ref: { readonly current: Element | null },
  preload: () => void,
  delay: number | undefined,
): (() => void) | void {
  const start = (strategy: PreloadStrategy) =>
    strategy(router, ref, preload, delay)
  if (typeof option === 'function') {
    return start(option)
  }
  if (builtins) {
    return start(builtins[option])
  }
  let active = true
  let cleanup: (() => void) | void
  // Preloading is best effort: a chunk that fails to load preloads nothing
  loadPreloadStrategy(option).then(
    (strategy) => {
      if (active) {
        cleanup = start(strategy)
      }
    },
    () => {},
  )
  return () => {
    active = false
    cleanup?.()
  }
}
