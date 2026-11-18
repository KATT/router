import type { AnyRouter } from '../router'
import type { PreloadLink, PreloadStrategy } from './types'

/**
 * A link's preload delay: its own `preloadDelay`, else the strategy's
 * `delay`, else the router's `defaultPreloadDelay`.
 */
export const delayOf = (router: AnyRouter, link: PreloadLink, delay?: number) =>
  link.delay ?? delay ?? router.options.defaultPreloadDelay ?? 0

/**
 * How far outside the viewport a link counts as in view: the strategy's
 * `rootMargin`, else the router's `defaultPreloadViewportMargin`.
 */
export const viewportMarginOf = (router: AnyRouter, rootMargin?: string) =>
  rootMargin ?? router.options.defaultPreloadViewportMargin ?? '100px'

/**
 * Makes a strategy factory return the same strategy for the same options, so
 * one called inline on every render still gives Links the same strategy: they
 * don't restart it, and links on one router share its state.
 */
export function memoStrategy<TOptions extends object>(
  create: (options: TOptions) => PreloadStrategy,
) {
  const made = new Map<string, PreloadStrategy>()
  return (options = {} as TOptions): PreloadStrategy => {
    const key = JSON.stringify(options, Object.keys(options).sort())
    let strategy = made.get(key)
    if (!strategy) {
      strategy = create(options)
      made.set(key, strategy)
    }
    return strategy
  }
}
