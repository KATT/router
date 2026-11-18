import { delayedPreload } from './delay'
import { delayOf, memoStrategy, viewportMarginOf } from './shared'

export interface ViewportPreloadOptions {
  /**
   * Milliseconds a link stays in view before it preloads.
   * A link's own `preloadDelay` wins.
   * @default the router's `defaultPreloadDelay`
   */
  delay?: number
  /**
   * How far outside the viewport a link counts as in view.
   * @default the router's `defaultPreloadViewportMargin`
   */
  rootMargin?: string
}

/**
 * `'viewport'`: each link has its own IntersectionObserver. Entering the
 * viewport preloads after the delay, and leaving first cancels it.
 */
export const viewportPreload = memoStrategy<ViewportPreloadOptions>(
  (options) => (router) => (link) => {
    const { element } = link
    if (!element || typeof IntersectionObserver !== 'function') {
      return
    }
    const { start, cancel } = delayedPreload(
      link,
      delayOf(router, link, options.delay),
    )
    let active = true
    const observer = new IntersectionObserver(
      (entries) => {
        // The latest entry wins; a queued one can arrive after disconnect()
        const entry = entries.pop()
        if (!active || !entry) {
          return
        }
        if (entry.isIntersecting) {
          start()
        } else {
          cancel()
        }
      },
      { rootMargin: viewportMarginOf(router, options.rootMargin) },
    )
    observer.observe(element)
    return {
      cancel,
      cleanup: () => {
        active = false
        observer.disconnect()
        cancel()
      },
    }
  },
)
