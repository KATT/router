import { intentPreload } from './intent'
import { renderPreload } from './render'
import { viewportPreload } from './viewport'

// The strategies the strings stand for, with default options. Only
// `loadPreloadStrategy` imports this module, on demand, so it is its own chunk.
export const intent = intentPreload()
export const viewport = viewportPreload()
export const render = renderPreload()
