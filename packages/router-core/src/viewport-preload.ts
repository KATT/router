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
 * One timer for every viewport link. It restarts on each intersection change
 * and on every scroll or resize, so it only fires once the page has settled;
 * then every queued link still in view preloads in the same tick.
 */
export function batchViewportPreloads(): ViewportPreloadScheduler {
  let queue = new Map<object, () => void>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let wait: number | undefined
  let listening = false

  const flush = () => {
    const queued = queue
    queue = new Map()
    timer = undefined
    queued.forEach((run) => run())
  }
  const restart = () => {
    clearTimeout(timer)
    timer = queue.size ? setTimeout(flush, wait) : undefined
  }

  return (link, preload, delay) => {
    if (!listening) {
      listening = true
      // Capture, so scrolling inside any container counts, not only the page
      document.addEventListener('scroll', restart, {
        capture: true,
        passive: true,
      })
      window.addEventListener('resize', restart, { passive: true })
    }
    if (preload) {
      queue.set(link, preload)
    } else {
      queue.delete(link)
    }
    if (delay === undefined && queue.size) {
      return
    }
    wait = delay ?? wait
    restart()
  }
}
