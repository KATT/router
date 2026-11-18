import { intentPreload } from './intent'
import { renderPreload } from './render'
import { viewportPreload } from './viewport'

// The strategies the strings run, in their own chunk: `loadPreloadStrategy`
// imports this file on demand, so apps that never use a string never load it.
export const intent = intentPreload()
export const viewport = viewportPreload()
export const render = renderPreload()
