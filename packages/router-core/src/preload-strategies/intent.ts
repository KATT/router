import { delayed } from './builtin'
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
 * `'intent'`: focus or hover preloads after the delay, and leaving or clicking
 * first cancels it. Touch preloads at once.
 *
 * The same options (or none) give the same strategy, so calling it inline in
 * render is fine.
 * @experimental
 */
export const intentPreload = /* @__PURE__ */ memoByOptions<
  IntentPreloadOptions,
  PreloadStrategy
>((options) => (router, ref, preload, delay) => {
  const element = ref.current
  if (!element) {
    return
  }
  const [start, cancel] = delayed(router, preload, delay ?? options.delay)
  const listeners: Record<string, () => void> = {
    // Like React's `onMouseEnter`, which listens to `mouseover`. It
    // bubbles from children, but a pending timer is kept.
    mouseover: start,
    focusin: start,
    mouseleave: cancel,
    focusout: cancel,
    touchstart: preload,
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
})
