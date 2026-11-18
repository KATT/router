import { delayed } from './builtin'
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
 * viewport preloads after the delay, and leaving or clicking first cancels
 * it.
 *
 * The same options (or none) give the same strategy, so calling it inline in
 * render is fine.
 * @experimental
 */
export const viewportPreload = /* @__PURE__ */ memoByOptions<
  ViewportPreloadOptions,
  PreloadStrategy
>((options) => (router, ref, preload, delay) => {
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
  // A click cancels a pending preload before it navigates
  element.addEventListener('click', cancel, { passive: true })
  return () => {
    active = false
    observer.disconnect()
    element.removeEventListener('click', cancel)
    cancel()
  }
})
