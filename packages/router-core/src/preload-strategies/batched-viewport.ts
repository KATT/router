import { createPreloadStrategy, delayOf } from './shared'

/** @experimental */
export interface BatchedViewportPreloadOptions {
  /**
   * Milliseconds the page must stay still (no intersection change, scroll or
   * resize) before the batch preloads. The last link to join sets it, and its
   * own `preloadDelay` wins.
   * @default the router's `preloadDefaults(batchedViewportPreload, ...)`, else `defaultPreloadDelay`
   */
  delay?: number
  /**
   * How far outside the viewport a link counts as in view.
   * @default the router's `preloadDefaults(batchedViewportPreload, ...)`, else `'100px'`
   */
  rootMargin?: string
}

/** One page-wide batch: an observer, a queue and a timer */
function createBatch(rootMargin: string) {
  const preloads = new Map<Element, () => void>()
  let queue = new Set<Element>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let wait = 0

  const flush = () => {
    timer = undefined
    const due = queue
    queue = new Set()
    due.forEach((element) => preloads.get(element)?.())
  }
  const restart = () => {
    clearTimeout(timer)
    timer = queue.size ? setTimeout(flush, wait) : undefined
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target, isIntersecting }) => {
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
    { rootMargin },
  )
  // Capture, so scrolling inside any container counts, not only the page
  document.addEventListener('scroll', restart, { capture: true, passive: true })
  window.addEventListener('resize', restart, { passive: true })

  return {
    add: (element: Element, preload: () => void, delay: number) => {
      preloads.set(element, preload)
      wait = delay
      observer.observe(element)
    },
    drop: (element: Element) => {
      queue.delete(element)
    },
    remove: (element: Element) => {
      observer.unobserve(element)
      preloads.delete(element)
      if (queue.delete(element) && !queue.size) {
        restart()
      }
    },
  }
}

/**
 * Like `'viewport'`, but links share one IntersectionObserver, queue and
 * timer. Entering the viewport queues a link and leaving drops it. The timer
 * restarts on every intersection change, scroll and resize, so it fires only
 * once the page has settled; then every queued link preloads in the same tick,
 * so data layers that batch per tick send one request.
 *
 * The batch belongs to the router: every link on it that uses this strategy
 * shares it, whether through `defaultPreload: batchedViewportPreload()` or
 * `<Link preload={batchedViewportPreload()} />` inline (the same options give
 * the same strategy). It starts in the browser, with the first link.
 * @experimental
 */
export const batchedViewportPreload =
  /* @__PURE__ */ createPreloadStrategy<BatchedViewportPreloadOptions>(
    (options, router) => {
      let batch: ReturnType<typeof createBatch> | undefined
      return (link) => {
        const { element } = link
        if (!element || typeof IntersectionObserver !== 'function') {
          return
        }
        const shared = (batch ??= createBatch(options.rootMargin ?? '100px'))
        shared.add(element, link.preload, delayOf(router, link, options.delay))
        return {
          cancel: () => shared.drop(element),
          cleanup: () => shared.remove(element),
        }
      }
    },
  )
