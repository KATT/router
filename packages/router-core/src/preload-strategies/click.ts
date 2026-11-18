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
