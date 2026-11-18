import * as React from 'react'

/**
 * One IntersectionObserver for every link. A link that enters the viewport is
 * queued and one that leaves is dropped. The timer restarts on every
 * intersection change and on every scroll or resize, so it only fires once the
 * page has settled. Then all queued links preload in the same tick, so tRPC's
 * batch link sends their loaders' calls in one request.
 */
function createViewportPreloader({ delay = 150, rootMargin = '100px' } = {}) {
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

  // Capture, so scrolling inside any container counts, not only the page
  document.addEventListener('scroll', restart, { capture: true, passive: true })
  window.addEventListener('resize', restart, { passive: true })

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

// One preloader for the whole page: every link shares its observer, queue and
// debounce timer, so links that scroll in at different times still flush
// together. Created on first use, which is always in the browser (a ref
// callback), so the server never shares one between requests.
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
