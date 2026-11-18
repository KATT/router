import type { PreloadLink } from './types'

/**
 * A link's own preload timer: `start` keeps the first, `cancel` drops it.
 * Without a delay, `start` preloads at once.
 */
export function delayedPreload(link: PreloadLink, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    start: () => {
      if (!delay) {
        link.preload()
        return
      }
      timer ??= setTimeout(() => {
        timer = undefined
        link.preload()
      }, delay)
    },
    cancel: () => {
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
    },
  }
}
