import { createRouter, renderPreload } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
export const router = createRouter({
  routeTree,
  defaultPreload: renderPreload(),
})
