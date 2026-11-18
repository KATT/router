import type { PreloadMode, PreloadStrategy } from './types'

export { batchedViewportPreload } from './batched-viewport'
export { intentPreload } from './intent'
export { renderPreload } from './render'
export { viewportPreload } from './viewport'
export { createPreloadStrategy } from './shared'
export { loadPreloadString, loadPreloadStrings, preloadString } from './lazy'
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
 * its element's event props, and loads `'viewport'`'s strategy on demand, so
 * only apps that use it ship it; the bundler plugin's `compilePreloadStrings`
 * rewrites literal strings to imports of their strategies.
 * @experimental
 */
export type PreloadOption = false | PreloadMode | PreloadStrategy
