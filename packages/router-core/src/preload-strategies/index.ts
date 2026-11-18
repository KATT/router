import type { PreloadMode, PreloadStrategy } from './types'

export { batchedViewportPreload } from './batched-viewport'
export { intentPreload } from './intent'
export { renderPreload } from './render'
export { viewportPreload } from './viewport'
export { createPreloadStrategy } from './shared'
export { stringStrategy } from './strings'
export type { BatchedViewportPreloadOptions } from './batched-viewport'
export type { IntentPreloadOptions, IntentTag } from './intent'
export type { ViewportPreloadOptions } from './viewport'
export type {
  LinkPreloader,
  PreloadLink,
  PreloadMode,
  PreloadRef,
  PreloadStrategy,
} from './types'

/**
 * A `preload` option as Links and the router take it. Each string is its
 * built-in strategy with default options: `'intent'` is `intentPreload()`,
 * `'viewport'` is `viewportPreload()` and `'render'` is `renderPreload()`.
 * A React Link runs `'intent'` (and `intentPreload(options)`) itself, through
 * its element's event props, and the other strings' strategies are bundled
 * with it.
 * @experimental
 */
export type PreloadOption = false | PreloadMode | PreloadStrategy
