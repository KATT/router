import { delayedPreload } from './delay'
import { createPreloadStrategy, delayOf } from './shared'

/** @experimental */
export interface IntentPreloadOptions {
  /**
   * Milliseconds from focus or hover to the preload.
   * A link's own `preloadDelay` wins.
   * @default `defaultPreloadDelay`
   */
  delay?: number
}

/**
 * `'intent'`: focus or hover preloads after the delay, and leaving or clicking
 * first cancels it. Touch preloads at once.
 * @experimental
 */
export const intentPreload =
  /* @__PURE__ */ createPreloadStrategy<IntentPreloadOptions>(
    (options, router) => (link) => {
      const { element } = link
      if (!element) {
        return
      }
      const { start, cancel } = delayedPreload(
        link,
        delayOf(router, link, options.delay),
      )
      const listeners: Record<string, (event: Event) => void> = {
        // Like React's `onMouseEnter`: a `mouseover` from outside the link
        mouseover: (event) => {
          if (!element.contains((event as MouseEvent).relatedTarget as Node)) {
            start()
          }
        },
        focusin: start,
        mouseleave: cancel,
        focusout: cancel,
        touchstart: link.preload,
        // Before the click navigates
        click: cancel,
      }
      for (const type in listeners) {
        element.addEventListener(type, listeners[type]!, { passive: true })
      }
      return () => {
        for (const type in listeners) {
          element.removeEventListener(type, listeners[type]!)
        }
        cancel()
      }
    },
  )
