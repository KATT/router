import type { AnyRouter } from '../router'

// What Links share with the built-in strategies. Links import this module, so
// it is in their chunk: the `'intent'` and `'viewport'` chunks share it from
// there, not from a chunk of their own that each would also have to load.

// A Link's ref also holds the cancel its strategy registers for a click the
// Link navigates on (`c`), which runs before it navigates. Only the Link
// knows whether a click navigates: not one with a modifier key, another
// button or target, or that a handler prevented. A strategy that stopped
// leaves its cancel until the next one registers, so a cancel must be
// harmless once its strategy stopped.
export type ClickRef = { c?: () => void }

/**
 * A Link calls it with its ref when a click navigates, so its strategy can
 * cancel a pending preload.
 * @internal
 */
export function linkNavigatingClick(ref: object) {
  ;(ref as ClickRef).c?.()
}

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
  const wait = delay ?? router.options.defaultPreloadDelay
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
