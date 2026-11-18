import type { AnyRouter } from '../router'
import type {
  LinkPreloader,
  PreloadLink,
  PreloadStrategy,
  PreloadStrategyOptions,
} from './types'

/**
 * A link's preload delay: its own `preloadDelay`, else the strategy's
 * `delay`, else the router's `defaultPreloadDelay`.
 */
export const delayOf = (router: AnyRouter, link: PreloadLink, delay?: number) =>
  link.delay ?? delay ?? router.options.defaultPreloadDelay ?? 0

/**
 * Makes a named strategy factory, `factory(options)(router)(link)`.
 *
 * - The same options give the same strategy, so one called inline on every
 *   render still gives Links the same strategy: they don't restart it.
 * - It's started once per router, with the router's `defaultPreloadOptions`
 *   for its name under the options it was called with. State its links share
 *   lives there.
 * - What it returns runs for each Link on the client.
 */
export function createPreloadStrategy<
  TName extends keyof PreloadStrategyOptions,
>(
  name: TName,
  start: (
    options: PreloadStrategyOptions[TName],
    router: AnyRouter,
  ) => LinkPreloader,
) {
  const made = new Map<string, PreloadStrategy>()
  return (options = {} as PreloadStrategyOptions[TName]): PreloadStrategy => {
    const key = JSON.stringify(options, Object.keys(options).sort())
    let strategy = made.get(key)
    if (!strategy) {
      strategy = (router) =>
        start(
          { ...router.options.defaultPreloadOptions?.[name], ...options },
          router,
        )
      made.set(key, strategy)
    }
    return strategy
  }
}
