import type { AnyRouter } from '../router'

/**
 * The strings `preload` takes. Each runs its built-in strategy with default
 * options, loaded on demand by `loadPreloadStrategy`.
 * @experimental
 */
export type PreloadMode = 'intent' | 'viewport' | 'render'

/**
 * What a strategy gets for one Link on the client.
 * @experimental
 */
export interface PreloadLink {
  /** The link's element, if its ref is attached */
  element: Element | null
  /** The same object for the Link's whole life, across option changes */
  key: object
  /** The link's own `preloadDelay`, if it sets one */
  delay: number | undefined
  /** Preloads the link's destination now */
  preload: () => void
}

/**
 * A strategy started for one router: called for each Link. It listens to or
 * observes the link's element itself, and can return a cleanup that runs when
 * the Link unmounts, or its options change and the strategy starts again.
 * @experimental
 */
export type LinkPreloader = (link: PreloadLink) => (() => void) | void

/**
 * Decides when Links preload. Make one with `createPreloadStrategy`.
 *
 * A Link calls it in an effect, on the client, with its router, its own ref,
 * a function that preloads its destination and its own `preloadDelay`, and
 * calls what it returns when the Link unmounts or its options change.
 * @experimental
 */
export type PreloadStrategy = (
  router: AnyRouter,
  ref: { readonly current: Element | null },
  preload: () => void,
  delay: number | undefined,
) => (() => void) | void
