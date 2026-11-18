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
 * A link's preload timer: `start` keeps a pending timer, or preloads at once
 * without a delay, and `cancel` drops it. A click the Link navigates on
 * cancels it.
 */
export function delayed(
  ref: object,
  preload: () => void,
  wait: number | undefined,
) {
  // Never 0 while pending: browsers number timers from 1
  let timer: ReturnType<typeof setTimeout> | 0 = 0
  const cancel = () => {
    clearTimeout(timer)
    timer = 0
  }
  const start = () =>
    wait
      ? (timer ||= setTimeout(() => {
          timer = 0
          preload()
        }, wait))
      : preload()
  ;(ref as ClickRef).c = cancel
  return [start, cancel] as const
}
