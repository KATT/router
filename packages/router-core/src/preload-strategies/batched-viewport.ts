import type { PreloadStrategy } from './types'

/**
 * Like `'viewport'`, but every link shares one IntersectionObserver, queue and
 * timer. Entering the viewport queues a link and leaving drops it. The timer
 * restarts on every intersection change, scroll and resize, so it fires only
 * once the page has settled; then every queued link preloads in the same tick,
 * so data layers that batch per tick send one request.
 *
 * Create it once, eg. `defaultPreload: batchedViewportPreload()`: links that
 * share an instance share a batch.
 */
export function batchedViewportPreload(): PreloadStrategy {
  const preloads = new Map<Element, () => void>()
  let queue = new Set<Element>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let wait = 0
  let observer: IntersectionObserver | undefined

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

  return (link) => {
    const { element } = link
    if (!element || typeof IntersectionObserver !== 'function') {
      return
    }
    if (!observer) {
      observer = new IntersectionObserver(
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
        { rootMargin: '100px' },
      )
      // Capture, so scrolling inside any container counts, not only the page
      document.addEventListener('scroll', restart, {
        capture: true,
        passive: true,
      })
      window.addEventListener('resize', restart, { passive: true })
    }
    const shared = observer
    preloads.set(element, link.preload)
    wait = link.delay
    shared.observe(element)
    return {
      cancel: () => {
        queue.delete(element)
      },
      cleanup: () => {
        shared.unobserve(element)
        preloads.delete(element)
        if (queue.delete(element) && !queue.size) {
          restart()
        }
      },
    }
  }
}
