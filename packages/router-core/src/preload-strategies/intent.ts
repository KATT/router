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
 * `'intent'` with options: focus or hover preloads after the delay, and
 * leaving, or a click the Link navigates on, first cancels it. Touch preloads
 * at once.
 *
 * A React Link runs it, like the string `'intent'`, through the element's own
 * event props, so a handler of the Link's that calls `preventDefault()` stops
 * it, as with `'intent'`. Called directly, eg. by another strategy, it listens
 * to the element itself; a link that already has focus when it starts (eg.
 * `autoFocus`) counts as focused.
 *
 * The same options (or none) give the same strategy, so calling it inline in
 * render is fine.
 * @experimental
 */
export const intentPreload = /* @__PURE__ */ memoByOptions(
  (options: IntentPreloadOptions): PreloadStrategy =>
    Object.assign(
      ((router, ref, preload, delay) =>
        intent(router, ref, preload, delay, options)) as PreloadStrategy,
      { i: options } satisfies IntentTag,
    ),
)

/**
 * What tells a React Link a strategy is `intentPreload(options)`: its
 * options, as `i`.
 * @internal
 */
export type IntentTag = { i?: IntentPreloadOptions }

/**
 * What `intentPreload(options)` listens with when it's called directly.
 * @internal
 */
export function intent(
  router: AnyRouter,
  ref: PreloadRef,
  preload: () => void,
  delay: number | undefined,
  options: IntentPreloadOptions,
): ReturnType<PreloadStrategy> {
  const element = ref.current
  // The link's own delay, else the strategy's, else the router's
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
