import { delayed, onNavigatingClick } from './click'
import { memoByOptions } from './memo'
import type { PreloadStrategy } from './types'

/** @experimental */
export interface ViewportPreloadOptions {
  /**
   * Milliseconds a link stays in view before it preloads.
   * A link's own `preloadDelay` wins.
   * @default `defaultPreloadDelay`
   */
  delay?: number
  /**
   * How far outside the viewport a link counts as in view.
   * @default `'100px'`
   */
  rootMargin?: string
}

/**
 * `'viewport'`: each link has its own IntersectionObserver. Entering the
 * viewport preloads after the delay, and leaving, or a click the Link
 * navigates on, first cancels it.
 *
 * The same options (or none) give the same strategy, so calling it inline in
 * render is fine.
 * @experimental
 */
export const viewportPreload = /* @__PURE__ */ memoByOptions(makeViewport)

/**
 * `viewportPreload` without the memo, for `'viewport'`'s own chunk.
 * @internal
 */
export function makeViewport(options: ViewportPreloadOptions): PreloadStrategy {
  return (router, ref, preload, delay) => {
    const element = ref.current
    if (!element || typeof IntersectionObserver !== 'function') {
      return
    }
    const [start, cancel] = delayed(router, preload, delay ?? options.delay)
    let active = true
    const observer = new IntersectionObserver(
      (entries) => {
        // The latest entry wins; a queued one can arrive after disconnect()
        if (!active) {
          return
        }
        if (entries.pop()?.isIntersecting) {
          start()
        } else {
          cancel()
        }
      },
      { rootMargin: options.rootMargin ?? '100px' },
    )
    observer.observe(element)
    const stopClick = onNavigatingClick(ref, cancel)
    return () => {
      active = false
      observer.disconnect()
      stopClick()
      cancel()
    }
  }
}
