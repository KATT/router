import type { PreloadLink } from './types'

/** A link's own `preloadDelay` timer: start keeps the first, cancel drops it. */
export function delayedPreload(link: PreloadLink) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    start: () => {
      if (!link.delay) {
        link.preload()
        return
      }
      timer ??= setTimeout(() => {
        timer = undefined
        link.preload()
      }, link.delay)
    },
    cancel: () => {
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
    },
  }
}
