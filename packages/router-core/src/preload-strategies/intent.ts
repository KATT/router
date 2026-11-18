import { delayedPreload } from './delay'
import { createPreloadStrategy, delayOf } from './shared'

export interface IntentPreloadOptions {
  /**
   * Milliseconds from focus or hover to the preload.
   * A link's own `preloadDelay` wins.
   * @default `defaultPreloadOptions.intent.delay`, else `defaultPreloadDelay`
   */
  delay?: number
}

/**
 * `'intent'`: focus or hover preloads after the delay, and leaving first
 * cancels it. Touch preloads at once.
 */
export const intentPreload = createPreloadStrategy(
  'intent',
  (options, router) => (link) => {
    const { start, cancel } = delayedPreload(
      link,
      delayOf(router, link, options.delay),
    )
    return {
      enter: start,
      leave: cancel,
      touch: link.preload,
      cancel,
      cleanup: cancel,
    }
  },
)
