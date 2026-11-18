import type { AnyRouter } from '../router'
import type { PreloadStrategy } from './types'

/**
 * Makes a built-in strategy factory. It is lighter than
 * `createPreloadStrategy`: built-ins keep no state per router, so the
 * strategy is the function Links call. Calls with the same options (or none)
 * give the same strategy, so one called inline on every render doesn't
 * restart its Links.
 */
/* @__NO_SIDE_EFFECTS__ */
export function builtin<TOptions extends object>(
  make: (options: TOptions) => PreloadStrategy,
): (options?: TOptions) => PreloadStrategy {
  // Keyed by the options' JSON, `'undefined'` without options. The same call
  // in the same place has its keys in the same order.
  const made: Record<string, PreloadStrategy> = {}
  return (options) =>
    (made[JSON.stringify(options)] ??= make(options ?? ({} as TOptions)))
}

/**
 * A link's own preload timer, for its `delay`, else the router's
 * `defaultPreloadDelay`: `start` keeps a pending timer, `cancel` drops it.
 * Without a delay, `start` preloads at once.
 */
export function delayed(
  router: AnyRouter,
  preload: () => void,
  delay: number | undefined,
) {
  const wait = delay ?? router.options.defaultPreloadDelay ?? 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
  }
  const start = () => {
    if (!wait) {
      preload()
      return
    }
    timer ??= setTimeout(() => {
      timer = undefined
      preload()
    }, wait)
  }
  return [start, cancel] as const
}
