import type * as BuiltinsModule from './builtins'
import type { PreloadStrategy } from './types'

/**
 * A `preload` string: the name of a built-in strategy.
 * @experimental
 */
export type PreloadMode = 'intent' | 'viewport' | 'render'

type Builtins = typeof BuiltinsModule

let builtins: Builtins | undefined
let loading: Promise<Builtins> | undefined

/**
 * The built-in strategy a `preload` string stands for: `'intent'` is
 * `intentPreload()`, `'viewport'` is `viewportPreload()` and `'render'` is
 * `renderPreload()`.
 *
 * The built-ins are their own chunk, so apps that don't use the strings
 * don't load them. The first call loads that chunk, once per page, and calls
 * return a promise until it's loaded; then they return the strategy at once.
 * @experimental
 */
export function loadPreloadStrategy(
  mode: PreloadMode,
): PreloadStrategy | Promise<PreloadStrategy> {
  if (builtins) {
    return builtins[mode]
  }
  return (loading ??= import('./builtins')).then(
    (loaded) => (builtins = loaded)[mode],
  )
}
