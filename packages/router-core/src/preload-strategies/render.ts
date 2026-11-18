import type { PreloadStrategy } from './types'

const rendered = new WeakSet<object>()

/** `'render'`: preloads once per Link, as soon as it mounts. */
export const renderPreload: PreloadStrategy = (link) => {
  if (!rendered.has(link.key)) {
    rendered.add(link.key)
    link.preload()
  }
}
