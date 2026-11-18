import { makeViewport } from '../viewport'

// What `'viewport'` stands for. Only `../lazy` imports this module, on
// demand, so it is its own chunk.
export const strategy = makeViewport({})
