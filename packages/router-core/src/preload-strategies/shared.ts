import type { AnyRouter } from '../router'
import type {
  LinkPreloader,
  PreloadLink,
  PreloadStrategy,
  PreloadStrategyFactory,
} from './types'

/**
 * A link's preload delay: its own `preloadDelay`, else the strategy's
 * `delay` (passed, or the router's default for the strategy), else the
 * router's `defaultPreloadDelay`.
 */
export const delayOf = (router: AnyRouter, link: PreloadLink, delay?: number) =>
  link.delay ?? delay ?? router.options.defaultPreloadDelay ?? 0

/**
 * Makes a strategy factory. Each strategy it makes carries the factory as its
 * `tag`, so router defaults find it with no name or registration:
 * `preloadStrategyDefaults: [myPreload({ delay: 100 })]`.
 *
 * - The same options give the same strategy, so one called inline on every
 *   render still gives Links the same strategy: they don't restart it.
 * - `start` runs once per router and set of options, with the router's
 *   defaults for this factory under the options the strategy was called
 *   with. State its links share lives there.
 * - What `start` returns runs for each Link on the client.
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function createPreloadStrategy<TOptions extends object = object>(
  start: (options: TOptions, router: AnyRouter) => LinkPreloader,
): PreloadStrategyFactory<TOptions> {
  const made = new Map<string, PreloadStrategy<TOptions>>()
  const tag: PreloadStrategyFactory<TOptions> = (options = {} as TOptions) => {
    const key = JSON.stringify(options, Object.keys(options).sort())
    let strategy = made.get(key)
    if (!strategy) {
      made.set(key, (strategy = { tag, options, start }))
    }
    return strategy
  }
  return tag
}
