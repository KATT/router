import * as React from 'react'

/**
 * One IntersectionObserver for every link. A link that enters the viewport is
 * queued, one that leaves is dropped, and every change restarts the timer.
 * When it fires, all queued links preload in the same tick, so tRPC's batch
 * link sends their loaders' calls in one request.
 */
function createViewportPreloader({ delay = 100, rootMargin = '100px' } = {}) {
  const preloads = new Map<Element, () => void>()
  const queue = new Set<Element>()
  let timer: ReturnType<typeof setTimeout> | undefined

  const flush = () => {
    timer = undefined
    const due = [...queue]
    queue.clear()
    due.forEach((el) => preloads.get(el)?.())
  }
  const restart = () => {
    clearTimeout(timer)
    timer = queue.size ? setTimeout(flush, delay) : undefined
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target, isIntersecting }) => {
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

  return {
    observe(el: Element, preload: () => void) {
      preloads.set(el, preload)
      observer.observe(el)
      return () => {
        observer.unobserve(el)
        preloads.delete(el)
        if (queue.delete(el) && !queue.size) {
          restart()
        }
      }
    },
  }
}

let preloader: ReturnType<typeof createViewportPreloader> | undefined

/**
 * A ref callback for a `<Link preload={false}>`: while `enabled`, the element
 * joins the shared viewport batch and `preload` runs when the batch flushes.
 * Already-loaded data is left to the router's and React Query's caches.
 */
export function useViewportBatchPreload(
  preload: () => unknown,
  enabled: boolean,
) {
  const latest = React.useRef(preload)
  React.useEffect(() => {
    latest.current = preload
  })
  return React.useCallback(
    (el: Element | null) => {
      if (!el || !enabled) {
        return undefined
      }
      preloader ??= createViewportPreloader()
      return preloader.observe(el, () => latest.current())
    },
    [enabled],
  )
}
