import type { PreloadMode, PreloadStrategy } from './types'

export { batchedViewportPreload } from './batched-viewport'
export { intentPreload } from './intent'
export { renderPreload } from './render'
export { viewportPreload } from './viewport'
export { createPreloadStrategy } from './shared'
export { loadPreloadStrings, preloadString } from './lazy'
export { linkNavigatingClick } from './click'
export type { BatchedViewportPreloadOptions } from './batched-viewport'
export type { IntentPreloadOptions } from './intent'
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
 * Links load the strings' strategies on demand, so only apps that use a
 * strategy ship it; the bundler plugin's `compilePreloadStrings` rewrites
 * literal strings to imports of their strategies.
 * @experimental
 */
export type PreloadOption = false | PreloadMode | PreloadStrategy
