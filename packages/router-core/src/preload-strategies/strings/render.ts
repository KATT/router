import { renderPreload } from '../render'

// What `'render'` stands for. Only `../lazy` imports this module, on demand,
// so it is its own chunk.
export const strategy = renderPreload()
