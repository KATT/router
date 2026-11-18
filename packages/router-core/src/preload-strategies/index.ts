import { intentPreload } from './intent'
import { renderPreload } from './render'
import { viewportPreload } from './viewport'
import type { PreloadStrategy } from './types'

export { intentPreload, renderPreload, viewportPreload }
export { batchedViewportPreload } from './batched-viewport'
export { createPreloadStrategy } from './shared'
export type { BatchedViewportPreloadOptions } from './batched-viewport'
export type { IntentPreloadOptions } from './intent'
export type { ViewportPreloadOptions } from './viewport'
export type { PreloadHandlers, PreloadLink, PreloadStrategy } from './types'

/**
 * A `preload` option as Links and the router take it
 * @experimental
 */
export type PreloadOption =
  | false
  | 'intent'
  | 'viewport'
  | 'render'
  | PreloadStrategy

/**
 * The strategy a `preload` option names, `undefined` for no preloading. The
 * strings are the built-in strategies with their default options.
 * @experimental
 */
export const resolvePreloadStrategy = (
  preload: PreloadOption | undefined,
): PreloadStrategy | undefined =>
  preload === 'intent'
    ? intentPreload()
    : preload === 'viewport'
      ? viewportPreload()
      : preload === 'render'
        ? renderPreload()
        : preload || undefined
