import type { PreloadStrategy } from './types'

// What `renderPreload()` returns, and `'render'`'s own chunk is. A Link's
// ref is the same object for its whole life, so it also notes that its Link
// preloaded (`r`).
type RenderRef = { r?: true }

export const render: PreloadStrategy = (_router, ref, preload) => {
  if (!(ref as RenderRef).r) {
    ;(ref as RenderRef).r = true
    preload()
  }
}

/**
 * `'render'`: preloads once per Link, as soon as it mounts.
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function renderPreload(): PreloadStrategy {
  return render
}
