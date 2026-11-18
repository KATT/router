import type { ClickRef } from './click'
import { memoByOptions } from './memo'
import type { AnyRouter } from '../router'
import type { PreloadRef, PreloadStrategy } from './types'

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
export const viewportPreload = /* @__PURE__ */ memoByOptions(
  (options: ViewportPreloadOptions): PreloadStrategy =>
    (router, ref, preload, delay) =>
      viewport(router, ref, preload, delay, options),
)

/**
 * The strategy `'viewport'`'s own chunk is: `viewportPreload()`, without the
 * memo or a wrapper. `viewportPreload(options)` passes its options as a fifth
 * argument.
 * @internal
 */
export function viewport(
  router: AnyRouter,
  ref: PreloadRef,
  preload: () => void,
  delay: number | undefined,
  options: ViewportPreloadOptions = {},
): ReturnType<PreloadStrategy> {
  const element = ref.current
  if (!element || typeof IntersectionObserver !== 'function') {
    return
  }
  // The link's own delay, else the strategy's, else the router's. Each
  // chunk has its own copy: a module the two shared would be a chunk of its
  // own that each also loads.
  const wait = delay ?? options.delay ?? router.options.defaultPreloadDelay
  let timer: ReturnType<typeof setTimeout> | undefined
  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
  }
  // Without a delay, preloads at once
  const start = () =>
    wait
      ? (timer ??= setTimeout(() => {
          timer = undefined
          preload()
        }, wait))
      : preload()
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
  ;(ref as ClickRef).c = cancel
  return () => {
    active = false
    observer.disconnect()
    cancel()
  }
}
