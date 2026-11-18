import { intentPreload } from './intent'
import { renderPreload } from './render'
import { viewportPreload } from './viewport'
import type { AnyRouter } from '../router'
import type { LinkPreloader, PreloadStrategy } from './types'

export { intentPreload, renderPreload, viewportPreload }
export { batchedViewportPreload } from './batched-viewport'
export { createPreloadStrategy } from './shared'
export type { BatchedViewportPreloadOptions } from './batched-viewport'
export type { IntentPreloadOptions } from './intent'
export type { ViewportPreloadOptions } from './viewport'
export type {
  LinkPreloader,
  PreloadHandlers,
  PreloadLink,
  PreloadStrategy,
  PreloadStrategyFactory,
} from './types'

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

/** The strings are the built-in factories, called without options */
const builtIns = {
  intent: intentPreload,
  viewport: viewportPreload,
  render: renderPreload,
}

const started = new WeakMap<AnyRouter, Map<PreloadStrategy, LinkPreloader>>()

/**
 * Starts the strategy a `preload` option names for a router and gives what
 * runs for each Link; `undefined` for no preloading. The router's
 * `preloadStrategyDefaults` entry with the strategy's tag is merged under its
 * options, and the factory turns the result back into a strategy, so
 * strategies that end up with the same options share one start per router.
 * @experimental
 */
export function resolvePreloadStrategy(
  preload: PreloadOption | undefined,
  router: AnyRouter,
): LinkPreloader | undefined {
  const strategy =
    typeof preload === 'string' ? builtIns[preload]() : preload || undefined
  if (!strategy) {
    return undefined
  }
  let byStrategy = started.get(router)
  if (!byStrategy) {
    started.set(router, (byStrategy = new Map()))
  }
  let forLinks = byStrategy.get(strategy)
  if (!forLinks) {
    const { tag, options } = strategy
    const merged = tag({
      ...router.options.preloadStrategyDefaults?.find(
        (defaults) => defaults.tag === tag,
      )?.options,
      ...options,
    })
    forLinks = byStrategy.get(merged) ?? merged.start(merged.options, router)
    byStrategy.set(merged, forLinks).set(strategy, forLinks)
  }
  return forLinks
}
