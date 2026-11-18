import { memoByOptions } from './memo'
import type { ClickRef } from './click'
import type { AnyRouter } from '../router'
import type { PreloadRef, PreloadStrategy } from './types'

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
export const intentPreload = /* @__PURE__ */ memoByOptions(
  (options: IntentPreloadOptions): PreloadStrategy =>
    (router, ref, preload, delay) =>
      intent(router, ref, preload, delay, options),
)

/**
 * The strategy `'intent'`'s own chunk is: `intentPreload()`, without the memo
 * or a wrapper. `intentPreload(options)` passes its options as a fifth
 * argument.
 * @internal
 */
export function intent(
  router: AnyRouter,
  ref: PreloadRef,
  preload: () => void,
  delay: number | undefined,
  options: IntentPreloadOptions = {},
): ReturnType<PreloadStrategy> {
  const element = ref.current
  // The link's own delay, else the strategy's, else the router's. Each
  // chunk has its own copy: a module the two shared would be a chunk of its
  // own that each also loads.
  const wait = delay ?? options.delay ?? router.options.defaultPreloadDelay
  // Never 0 while pending: browsers number timers from 1
  let timer: ReturnType<typeof setTimeout> | 0 = 0
  const cancel = () => {
    clearTimeout(timer)
    timer = 0
  }
  // Without a delay, preloads at once
  const start = () =>
    wait
      ? (timer ||= setTimeout(() => {
          timer = 0
          preload()
        }, wait))
      : preload()
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
  ;(ref as ClickRef).c = cancel
  // Focused before the listeners, eg. `autoFocus` or a parent's layout effect
  if (element.contains(document.activeElement)) {
    start()
  }
  return () => {
    for (const type in listeners) {
      element.removeEventListener(type, listeners[type]!)
    }
    cancel()
  }
}
