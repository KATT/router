import { delayed, onNavigatingClick } from './click'
import { memoByOptions } from './memo'
import type { PreloadStrategy } from './types'

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
 * `'intent'`: focus or hover preloads after the delay, and leaving, or a
 * click the Link navigates on, first cancels it. Touch preloads at once. A
 * link that already has focus when the strategy starts (eg. `autoFocus`)
 * counts as focused.
 *
 * The same options (or none) give the same strategy, so calling it inline in
 * render is fine.
 * @experimental
 */
export const intentPreload = /* @__PURE__ */ memoByOptions(makeIntent)

/**
 * `intentPreload` without the memo, for `'intent'`'s own chunk.
 * @internal
 */
export function makeIntent(options: IntentPreloadOptions): PreloadStrategy {
  return (router, ref, preload, delay) => {
    const element = ref.current
    if (!element) {
      return
    }
    const [start, cancel] = delayed(router, preload, delay ?? options.delay)
    // Like React's `onMouseEnter`: moving or focusing between the link's own
    // children isn't entering or leaving it
    const within = (event: Event) =>
      element.contains((event as MouseEvent).relatedTarget as Node | null)
    const listeners: Record<string, (event: Event) => void> = {
      mouseover: (event) => within(event) || start(),
      focusin: (event) => within(event) || start(),
      mouseleave: cancel,
      focusout: (event) => within(event) || cancel(),
      touchstart: preload,
    }
    for (const type in listeners) {
      element.addEventListener(type, listeners[type]!, { passive: true })
    }
    const stopClick = onNavigatingClick(ref, cancel)
    // Focused before the listeners, eg. `autoFocus` or a parent's layout effect
    if (element.contains(document.activeElement)) {
      start()
    }
    return () => {
      for (const type in listeners) {
        element.removeEventListener(type, listeners[type]!)
      }
      stopClick()
      cancel()
    }
  }
}
