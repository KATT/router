import { delayedPreload } from './delay'
import type { PreloadStrategy } from './types'

/**
 * `'intent'`: focus or hover preloads after `preloadDelay`, and leaving first
 * cancels it. Touch preloads at once.
 */
export const intentPreload: PreloadStrategy = (link) => {
  const { start, cancel } = delayedPreload(link)
  return {
    enter: start,
    leave: cancel,
    touch: link.preload,
    cancel,
    cleanup: cancel,
  }
}
