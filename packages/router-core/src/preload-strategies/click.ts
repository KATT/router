import type { AnyRouter } from '../router'

// What Links share with the built-in strategies. Links import this module, so
// it is in their chunk: the `'intent'` and `'viewport'` chunks share it from
// there, not from a chunk of their own that each would also have to load.

// What a Link's strategy runs when the Link navigates on a click, by the
// Link's ref. Only the Link knows whether a click navigates: not one with a
// modifier key, another button or target, or that a handler prevented.
const onClick = new WeakMap<object, () => void>()

/**
 * Until the returned cleanup, `cancel` runs when the Link with this ref
 * navigates on a click, before it navigates.
 */
export function onNavigatingClick(ref: object, cancel: () => void) {
  onClick.set(ref, cancel)
  return () => {
    if (onClick.get(ref) === cancel) {
      onClick.delete(ref)
    }
  }
}

/**
 * A Link calls it with its ref when a click navigates, so its strategy can
 * cancel a pending preload.
 * @internal
 */
export function linkNavigatingClick(ref: object) {
  onClick.get(ref)?.()
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
