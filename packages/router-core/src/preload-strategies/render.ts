import type { PreloadStrategy } from './types'

const rendered = /* @__PURE__ */ new WeakSet<object>()

// What `renderPreload()` returns, and `'render'`'s own chunk uses. A Link's
// ref is the same object for its whole life.
export const render: PreloadStrategy = (_router, ref, preload) => {
  if (!rendered.has(ref)) {
    rendered.add(ref)
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
