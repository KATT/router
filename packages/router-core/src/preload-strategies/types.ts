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
  /** The Link unmounts, or its options change and the strategy starts again */
  cleanup?: () => void
}

/**
 * A strategy started for one router: called for each Link.
 * @experimental
 */
export type LinkPreloader = (link: PreloadLink) => PreloadHandlers | void

/**
 * Decides when Links preload. Made by a factory from `createPreloadStrategy`,
 * it carries that factory as its `tag` and the options it was called with.
 * It's started once per router, with the options of the router's
 * `preloadStrategyDefaults` entry with the same tag under its own, and the
 * function `start` returns runs for each Link on the client: when the Link
 * mounts and again when its options change. `'intent'`, `'viewport'` and
 * `'render'` are the built-in factories called without options.
 * @experimental
 */
export interface PreloadStrategy<TOptions extends object = any> {
  /** The factory that made it; router defaults are matched by it */
  tag: PreloadStrategyFactory<TOptions>
  /** The options it was called with */
  options: TOptions
  /** Starts it for a router, with the router's defaults merged in */
  start: (options: TOptions, router: AnyRouter) => LinkPreloader
}

/**
 * Makes strategies; the same options give the same strategy
 * @experimental
 */
export type PreloadStrategyFactory<TOptions extends object = any> = (
  options?: TOptions,
) => PreloadStrategy<TOptions>
