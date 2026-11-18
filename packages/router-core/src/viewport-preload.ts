/**
 * Decides when viewport preloads run. A Link calls it with `preload` when it
 * enters the viewport and without it when it leaves; both pass the link's
 * `preloadDelay`. On unmount it is called with neither, to drop the link.
 */
export type ViewportPreloadScheduler = (
  link: object,
  preload?: () => void,
  delay?: number,
) => void

/**
 * One timer for every viewport link: each intersection change restarts it,
 * and when it fires every queued link still in view preloads in the same tick.
 */
export function batchViewportPreloads(): ViewportPreloadScheduler {
  let queue = new Map<object, () => void>()
  let timer: ReturnType<typeof setTimeout> | undefined
  return (link, preload, delay) => {
    if (preload) {
      queue.set(link, preload)
    } else {
      queue.delete(link)
    }
    if (delay === undefined && queue.size) {
      return
    }
    clearTimeout(timer)
    timer = queue.size
      ? setTimeout(() => {
          const queued = queue
          queue = new Map()
          timer = undefined
          queued.forEach((run) => run())
        }, delay)
      : undefined
  }
}
