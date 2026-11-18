import type { AnyRouter } from '../router'

/** What a strategy gets for one Link on the client. */
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

/** A strategy started for one router: called for each Link. */
export type LinkPreloader = (link: PreloadLink) => PreloadHandlers | void

/**
 * Decides when Links preload. It's started once per router, which is where
 * it reads the router's defaults and keeps state its links share, and the
 * function it returns runs for each Link on the client: when the Link mounts
 * and again when its options change. `'intent'`, `'viewport'` and `'render'`
 * are the built-in strategies by name.
 */
export type PreloadStrategy = (router: AnyRouter) => LinkPreloader
