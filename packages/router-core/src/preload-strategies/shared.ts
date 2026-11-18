import type { AnyRouter } from '../router'
import type {
  LinkPreloader,
  PreloadDefaults,
  PreloadLink,
  PreloadStrategy,
  PreloadStrategyFactory,
} from './types'

/**
 * A link's preload delay: its own `preloadDelay`, else the strategy's
 * `delay`, else the router's `defaultPreloadDelay`.
 */
export const delayOf = (router: AnyRouter, link: PreloadLink, delay?: number) =>
  link.delay ?? delay ?? router.options.defaultPreloadDelay ?? 0

/**
 * Router-wide options for a strategy factory, for `defaultPreloadOptions`.
 * The options are typed from the factory, and the router finds them by the
 * factory itself, so your own strategies need no registering:
 *
 * ```ts
 * createRouter({
 *   defaultPreloadOptions: [
 *     preloadDefaults(viewportPreload, { rootMargin: '200px' }),
 *     preloadDefaults(batchedViewportPreload, { delay: 150 }),
 *   ],
 * })
 * ```
 * @experimental
 */
export const preloadDefaults = <TOptions extends object>(
  factory: PreloadStrategyFactory<TOptions>,
  options: NoInfer<TOptions>,
): PreloadDefaults => [factory, options]

/**
 * Makes a strategy factory, `factory(options)(router)(link)`.
 *
 * - The same options give the same strategy, so one called inline on every
 *   render still gives Links the same strategy: they don't restart it.
 * - It's started once per router, with the router's `preloadDefaults` for
 *   this factory under the options it was called with. State its links share
 *   lives there.
 * - What it returns runs for each Link on the client.
 * @experimental
 */
export function createPreloadStrategy<TOptions extends object = object>(
  start: (options: TOptions, router: AnyRouter) => LinkPreloader,
): PreloadStrategyFactory<TOptions> {
  const made = new Map<string, PreloadStrategy>()
  const factory = (options = {} as TOptions): PreloadStrategy => {
    const key = JSON.stringify(options, Object.keys(options).sort())
    let strategy = made.get(key)
    if (!strategy) {
      // The router's entries by factory, so a later one for it wins
      strategy = (router) =>
        start(
          {
            ...new Map(router.options.defaultPreloadOptions).get(factory),
            ...options,
          },
          router,
        )
      made.set(key, strategy)
    }
    return strategy
  }
  return factory
}
