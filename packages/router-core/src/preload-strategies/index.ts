import type { PreloadMode, PreloadStrategy } from './types'

export { batchedViewportPreload } from './batched-viewport'
export { intentPreload } from './intent'
export { renderPreload } from './render'
export { viewportPreload } from './viewport'
export { createPreloadStrategy } from './shared'
export { loadPreloadStrategy, startLinkPreload } from './load'
export type { BatchedViewportPreloadOptions } from './batched-viewport'
export type { IntentPreloadOptions } from './intent'
export type { ViewportPreloadOptions } from './viewport'
export type {
  LinkPreloader,
  PreloadLink,
  PreloadMode,
  PreloadStrategy,
} from './types'

/**
 * A `preload` option as Links and the router take it. Each string works like
 * its built-in strategy with default options: `'intent'` like
 * `intentPreload()`, `'viewport'` like `viewportPreload()` and `'render'` like
 * `renderPreload()`. Links don't ship that code: the first Link that uses a
 * string loads the built-in strategies in their own chunk, and Links start
 * them once it has loaded.
 * @experimental
 */
export type PreloadOption = false | PreloadMode | PreloadStrategy
