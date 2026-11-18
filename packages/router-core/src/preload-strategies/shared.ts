import type { PreloadLink, PreloadStrategy } from './types'

/**
 * Makes a strategy factory, `factory(options)(link)`, the way the built-in
 * ones are made. The same options give the same strategy, so one called
 * inline on every render doesn't restart its Links. State the strategy's
 * links share lives in `make`'s closure: one per options, for the whole page.
 * Create it lazily, on the first link, so the server never does.
 * @experimental
 */
export const createPreloadStrategy = <TOptions extends object>(
  make: (options: TOptions) => PreloadStrategy,
) => {
  const made = new Map<string, PreloadStrategy>()
  return (options = {} as TOptions): PreloadStrategy => {
    const key = JSON.stringify(options, Object.keys(options).sort())
    let strategy = made.get(key)
    if (!strategy) {
      made.set(key, (strategy = make(options)))
    }
    return strategy
  }
}

/**
 * A link's preload delay: its own `preloadDelay`, else the strategy's
 * `delay`, else its router's `defaultPreloadDelay`.
 */
export const delayOf = (link: PreloadLink, delay?: number) =>
  link.delay ?? delay ?? link.router.options.defaultPreloadDelay ?? 0

/**
 * A link's own preload timer: `start` keeps the first, `cancel` drops it.
 * Without a delay, `start` preloads at once.
 */
export function delayedPreload(link: PreloadLink, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    start: () => {
      if (!delay) {
        link.preload()
        return
      }
      timer ??= setTimeout(() => {
        timer = undefined
        link.preload()
      }, delay)
    },
    cancel: () => {
      clearTimeout(timer)
      timer = undefined
    },
  }
}
