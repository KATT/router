import type { AnyRouter } from '../router'
import type { LinkPreloader, PreloadLink, PreloadStrategy } from './types'

/**
 * A link's preload delay: its own `preloadDelay`, else the strategy's
 * `delay`, else the router's `defaultPreloadDelay`.
 */
export const delayOf = (router: AnyRouter, link: PreloadLink, delay?: number) =>
  link.delay ?? delay ?? router.options.defaultPreloadDelay ?? 0

/**
 * Makes a strategy factory, `factory(options)(router)(link)`.
 *
 * - The same options give the same strategy, so one called inline on every
 *   render still gives Links the same strategy: they don't restart it.
 * - It's started once per router, with the options it was called with. State
 *   its links share lives there.
 * - What it returns runs for each Link on the client, with the link's element.
 *   It listens to whatever it needs and returns a cleanup.
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function createPreloadStrategy<TOptions extends object = object>(
  start: (options: TOptions, router: AnyRouter) => LinkPreloader,
) {
  const made = new Map<string, PreloadStrategy>()
  return (options = {} as TOptions): PreloadStrategy => {
    const key = JSON.stringify(options, Object.keys(options).sort())
    let strategy = made.get(key)
    if (!strategy) {
      const started = new WeakMap<AnyRouter, LinkPreloader>()
      strategy = (router, ref, preload, delay) => {
        let forLinks = started.get(router)
        if (!forLinks) {
          started.set(router, (forLinks = start(options, router)))
        }
        return forLinks({ element: ref.current, key: ref, delay, preload })
      }
      made.set(key, strategy)
    }
    return strategy
  }
}
