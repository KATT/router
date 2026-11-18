import { intent } from './intent'
import { render } from './render'
import { viewport } from './viewport'
import type { PreloadStrategy } from './types'

/**
 * The built-in strategy a `preload` string stands for: `'intent'` is
 * `intentPreload()`, `'viewport'` is `viewportPreload()` and `'render'` is
 * `renderPreload()`; `undefined` for other strings. Links bundle all three,
 * as a string only known at run time can name any of them.
 * @experimental
 */
export const preloadString = (mode: string): PreloadStrategy | undefined =>
  mode === 'intent'
    ? intent
    : mode === 'viewport'
      ? viewport
      : mode === 'render'
        ? render
        : undefined
