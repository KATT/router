import { intentPreload } from './intent'
import { renderPreload } from './render'
import { viewportPreload } from './viewport'
import type { PreloadStrategy } from './types'

export { intentPreload, renderPreload, viewportPreload }
export { batchedViewportPreload } from './batched-viewport'
export type { PreloadHandlers, PreloadLink, PreloadStrategy } from './types'

/** A `preload` option as Links and the router take it */
export type PreloadOption =
  | false
  | 'intent'
  | 'viewport'
  | 'render'
  | PreloadStrategy

/** The strategy a `preload` option names, or `undefined` for none */
export function resolvePreloadStrategy(
  preload: PreloadOption | undefined,
): PreloadStrategy | undefined {
  if (preload === 'intent') {
    return intentPreload
  }
  if (preload === 'viewport') {
    return viewportPreload
  }
  if (preload === 'render') {
    return renderPreload
  }
  return preload || undefined
}
