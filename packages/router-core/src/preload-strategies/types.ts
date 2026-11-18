import type { AnyRouter } from '../router'

/**
 * What a strategy gets for one Link on the client.
 * @experimental
 */
export interface PreloadLink {
  /** The Link's router, to read its defaults such as `defaultPreloadDelay` */
  router: AnyRouter
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
 * How a strategy reacts to the Link's own events. Every one is optional.
 * @experimental
 */
export interface PreloadHandlers {
  /** Focus or mouse enter */
  enter?: () => void
  /** Blur or mouse leave */
  leave?: () => void
  /** Touch start */
  touch?: () => void
  /** A click, right before it navigates: drop anything pending */
  cancel?: () => void
  /** The Link unmounts, or its options change and the strategy runs again */
  cleanup?: () => void
}

/**
 * Decides when Links preload. It runs for each Link on the client, when the
 * Link mounts and again when its options change, and can return handlers for
 * the Link's events. `'intent'`, `'viewport'` and `'render'` are the built-in
 * strategies with their default options.
 *
 * A different function restarts the Link, so create your own once, at module
 * level, rather than inline in render.
 * @experimental
 */
export type PreloadStrategy = (link: PreloadLink) => PreloadHandlers | void
