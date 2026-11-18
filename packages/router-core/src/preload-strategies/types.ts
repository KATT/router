import type { AnyRouter } from '../router'

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
 * How a strategy reacts to events on the link's element. Every one is
 * optional.
 * @experimental
 */
export interface PreloadHandlers {
  /** Focus or mouse enter */
  enter?: () => void
  /** Blur or mouse leave */
  leave?: () => void
  /** Touch start */
  touch?: () => void
  /** A click on the link: drop anything pending */
  cancel?: () => void
  /** The Link unmounts, or its options change and the strategy starts again */
  cleanup?: () => void
}

/**
 * A strategy started for one router: called for each Link.
 * @experimental
 */
export type LinkPreloader = (link: PreloadLink) => PreloadHandlers | void

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
