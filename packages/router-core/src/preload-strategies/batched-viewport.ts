import { onNavigatingClick } from './click'
import { createPreloadStrategy } from './shared'

/** @experimental */
export interface BatchedViewportPreloadOptions {
  /**
   * Milliseconds the page must stay still (no intersection change, scroll or
   * resize) before the batch preloads. Links' own `preloadDelay` doesn't
   * change it.
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
 * Like `'viewport'`, but links share one IntersectionObserver, queue and
 * timer. Entering the viewport queues a link, and leaving, or a click the
 * Link navigates on, drops it. The timer restarts on every intersection
 * change, scroll and resize, so it fires only once the page has settled; then
 * every queued link preloads in the same tick, so data layers that batch per
 * tick send one request.
 *
 * The timer waits the strategy's `delay`, else the router's
 * `defaultPreloadDelay` as it is when the timer starts. A link's own
 * `preloadDelay` doesn't change it.
 *
 * The batch belongs to the router: every link on it that uses this strategy
 * shares it, whether through `defaultPreload: batchedViewportPreload()` or
 * `<Link preload={batchedViewportPreload()} />` inline (the same options give
 * the same strategy). It starts in the browser with the first link, and stops
 * listening to the page once its last link is gone.
 * @experimental
 */
export const batchedViewportPreload =
  /* @__PURE__ */ createPreloadStrategy<BatchedViewportPreloadOptions>(
    (options, router) => {
      const preloads = new Map<Element, () => void>()
      let queue = new Set<Element>()
      let timer: ReturnType<typeof setTimeout> | undefined
      let observer: IntersectionObserver | undefined

      const flush = () => {
        timer = undefined
        const due = queue
        queue = new Set()
        // A preload can unmount a link still in `due`: it is skipped
        due.forEach((element) => preloads.get(element)?.())
      }
      const restart = () => {
        clearTimeout(timer)
        timer = queue.size
          ? setTimeout(
              flush,
              options.delay ?? router.options.defaultPreloadDelay,
            )
          : undefined
      }
      const dequeue = (element: Element) => {
        if (queue.delete(element) && !queue.size) {
          restart()
        }
      }

      return ({ element, key, preload }) => {
        if (!element || typeof IntersectionObserver !== 'function') {
          return
        }
        if (!observer) {
          observer = new IntersectionObserver(
            (entries) => {
              entries.forEach(({ target, isIntersecting }) => {
                // An entry can arrive after its link is gone
                if (!preloads.has(target)) {
                  return
                }
                if (isIntersecting) {
                  queue.add(target)
                } else {
                  queue.delete(target)
                }
              })
              restart()
            },
            { rootMargin: options.rootMargin ?? '100px' },
          )
          // Capture, so scrolling inside any container counts, not only the
          // page
          document.addEventListener('scroll', restart, {
            capture: true,
            passive: true,
          })
          window.addEventListener('resize', restart, { passive: true })
        }
        const linkObserver = observer
        preloads.set(element, preload)
        linkObserver.observe(element)
        const stopClick = onNavigatingClick(key, () => dequeue(element))
        return () => {
          stopClick()
          linkObserver.unobserve(element)
          preloads.delete(element)
          dequeue(element)
          if (!preloads.size) {
            linkObserver.disconnect()
            observer = undefined
            document.removeEventListener('scroll', restart, true)
            window.removeEventListener('resize', restart)
          }
        }
      }
    },
  )
