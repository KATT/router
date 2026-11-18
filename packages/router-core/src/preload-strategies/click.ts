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
