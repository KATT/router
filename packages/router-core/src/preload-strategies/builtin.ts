import type { AnyRouter } from '../router'

/**
 * A link's own preload timer, for its `delay`, else the router's
 * `defaultPreloadDelay`: `start` keeps a pending timer, `cancel` drops it.
 * Without a delay, `start` preloads at once.
 */
export function delayed(
  router: AnyRouter,
  preload: () => void,
  delay: number | undefined,
) {
  const wait = delay ?? router.options.defaultPreloadDelay ?? 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
  }
  const start = () => {
    if (!wait) {
      preload()
      return
    }
    timer ??= setTimeout(() => {
      timer = undefined
      preload()
    }, wait)
  }
  return [start, cancel] as const
}
