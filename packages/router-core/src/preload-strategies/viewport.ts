import { delayedPreload } from './delay'
import { createPreloadStrategy, delayOf } from './shared'

export interface ViewportPreloadOptions {
  /**
   * Milliseconds a link stays in view before it preloads.
   * A link's own `preloadDelay` wins.
   * @default `defaultPreloadOptions.viewport.delay`, else `defaultPreloadDelay`
   */
  delay?: number
  /**
   * How far outside the viewport a link counts as in view.
   * @default `defaultPreloadOptions.viewport.rootMargin`, else `'100px'`
   */
  rootMargin?: string
}

/**
 * `'viewport'`: each link has its own IntersectionObserver. Entering the
 * viewport preloads after the delay, and leaving first cancels it.
 */
export const viewportPreload = createPreloadStrategy(
  'viewport',
  (options, router) => (link) => {
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
      { rootMargin: options.rootMargin ?? '100px' },
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
