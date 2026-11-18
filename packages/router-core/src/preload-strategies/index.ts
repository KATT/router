import { intentPreload } from './intent'
import { renderPreload } from './render'
import { viewportPreload } from './viewport'
import type { AnyRouter } from '../router'
import type { LinkPreloader, PreloadStrategy } from './types'

export { intentPreload, renderPreload, viewportPreload }
export { batchedViewportPreload } from './batched-viewport'
export type { BatchedViewportPreloadOptions } from './batched-viewport'
export type { IntentPreloadOptions } from './intent'
export type { ViewportPreloadOptions } from './viewport'
export type {
  LinkPreloader,
  PreloadHandlers,
  PreloadLink,
  PreloadStrategy,
} from './types'

/** A `preload` option as Links and the router take it */
export type PreloadOption =
  | false
  | 'intent'
  | 'viewport'
  | 'render'
  | PreloadStrategy

const started = new WeakMap<
  PreloadStrategy,
  WeakMap<AnyRouter, LinkPreloader>
>()

/**
 * Starts the strategy a `preload` option names for a router, once per router,
 * and gives what runs for each Link; `undefined` for no preloading. The
 * strings are the built-in strategies with their default options.
 */
export function resolvePreloadStrategy(
  preload: PreloadOption | undefined,
  router: AnyRouter,
): LinkPreloader | undefined {
  const strategy =
    preload === 'intent'
      ? intentPreload()
      : preload === 'viewport'
        ? viewportPreload()
        : preload === 'render'
          ? renderPreload()
          : preload || undefined
  if (!strategy) {
    return undefined
  }
  let byRouter = started.get(strategy)
  if (!byRouter) {
    started.set(strategy, (byRouter = new WeakMap()))
  }
  let forLinks = byRouter.get(router)
  if (!forLinks) {
    byRouter.set(router, (forLinks = strategy(router)))
  }
  return forLinks
}
