import { delayedPreload } from './delay'
import type { PreloadStrategy } from './types'

/**
 * `'viewport'`: each link has its own IntersectionObserver. Entering the
 * viewport preloads after `preloadDelay`, and leaving first cancels it.
 */
export const viewportPreload: PreloadStrategy = (link) => {
  const { element } = link
  if (!element || typeof IntersectionObserver !== 'function') {
    return
  }
  const { start, cancel } = delayedPreload(link)
  let active = true
  const observer = new IntersectionObserver(
    (entries) => {
      // The latest entry wins; a queued one can arrive after disconnect()
      const entry = entries.pop()
      if (!active || !entry) {
        return
      }
      if (entry.isIntersecting) {
        start()
      } else {
        cancel()
      }
    },
    { rootMargin: '100px' },
  )
  observer.observe(element)
  return {
    cancel,
    cleanup: () => {
      active = false
      observer.disconnect()
      cancel()
    },
  }
}
