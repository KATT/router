import type { PreloadStrategy } from './types'

const rendered = /* @__PURE__ */ new WeakSet<object>()

const render: PreloadStrategy = (link) => {
  if (!rendered.has(link.key)) {
    rendered.add(link.key)
    link.preload()
  }
}

/**
 * `'render'`: preloads once per Link, as soon as it mounts.
 * @experimental
 */
export const renderPreload = () => render
