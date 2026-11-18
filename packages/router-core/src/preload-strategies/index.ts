import type { PreloadStrategy } from './types'

export { batchedViewportPreload } from './batched-viewport'
export { intentPreload } from './intent'
export { renderPreload } from './render'
export { viewportPreload } from './viewport'
export { createPreloadStrategy } from './shared'
export type { BatchedViewportPreloadOptions } from './batched-viewport'
export type { IntentPreloadOptions } from './intent'
export type { ViewportPreloadOptions } from './viewport'
export type {
  LinkPreloader,
  PreloadHandlers,
  PreloadLink,
  PreloadStrategy,
} from './types'

/**
 * A `preload` option as Links and the router take it. Each string works like
 * its built-in strategy with default options: `'intent'` like
 * `intentPreload()`, `'viewport'` like `viewportPreload()` and `'render'` like
 * `renderPreload()`. Links run the strings with their own code, so only apps
 * that import a strategy ship one.
 * @experimental
 */
export type PreloadOption =
  | false
  | 'intent'
  | 'viewport'
  | 'render'
  | PreloadStrategy
