/** What a strategy gets for one Link on the client. */
export interface PreloadLink {
  /** The link's element, if its ref is attached */
  element: Element | null
  /** The same object for the Link's whole life, across option changes */
  key: object
  /** The link's `preloadDelay`, or the router's `defaultPreloadDelay` */
  delay: number
  /** Preloads the link's destination now */
  preload: () => void
}

/** How a strategy reacts to the Link's own events. Every one is optional. */
export interface PreloadHandlers {
  /** Focus or mouse enter */
  enter?: () => void
  /** Blur or mouse leave */
  leave?: () => void
  /** Touch start */
  touch?: () => void
  /** A click, right before it navigates: drop anything pending */
  cancel?: () => void
  /** The Link unmounts, or its options change and the strategy starts again */
  cleanup?: () => void
}

/**
 * Decides when a Link preloads. A Link calls it on the client when it mounts
 * and again when its options change. `'intent'`, `'viewport'` and `'render'`
 * are the built-in strategies by name.
 */
export type PreloadStrategy = (link: PreloadLink) => PreloadHandlers | void
