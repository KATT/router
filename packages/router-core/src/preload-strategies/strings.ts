import { render } from './render'
import { viewport } from './viewport'
import type { PreloadStrategy } from './types'

/**
 * The built-in strategy a React Link runs for `'viewport'` or `'render'`
 * (`undefined` for other strings). The Link runs `'intent'` itself, through
 * its element's event props.
 * @internal
 */
export const stringStrategy = (mode: string): PreloadStrategy | undefined =>
  mode === 'viewport' ? viewport : mode === 'render' ? render : undefined
