import { memoByOptions } from './memo'
import type { AnyRouter } from '../router'
import type { LinkPreloader, PreloadStrategy } from './types'

/**
 * Makes a strategy factory, `factory(options)(router)(link)`.
 *
 * - The same options give the same strategy, so one called inline on every
 *   render still gives Links the same strategy: they don't restart it. Options
 *   are the same when their own string, number, boolean and `null` values are
 *   (`undefined` ones don't count). Options with any other value, eg. an
 *   object or a function, give a new strategy on every call: create such a
 *   strategy once, outside render.
 * - It's started once per router, with the options it was called with. State
 *   its links share lives there.
 * - What it returns runs for each Link on the client, with the link's element.
 *   It listens to whatever it needs and returns a cleanup.
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function createPreloadStrategy<TOptions extends object = object>(
  start: (options: TOptions, router: AnyRouter) => LinkPreloader,
): (options?: TOptions) => PreloadStrategy {
  return memoByOptions((options: TOptions): PreloadStrategy => {
    const started = new WeakMap<AnyRouter, LinkPreloader>()
    return (router, ref, preload, delay) => {
      let forLinks = started.get(router)
      if (!forLinks) {
        started.set(router, (forLinks = start(options, router)))
      }
      return forLinks({ element: ref.current, key: ref, delay, preload })
    }
  })
}
