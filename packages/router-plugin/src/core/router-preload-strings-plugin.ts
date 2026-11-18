import { logDiff } from '@tanstack/router-utils'
import {
  compilePreloadStrings,
  preloadStringsCodeFilter,
  preloadStringsIdFilter,
} from './preload-strings'
import { debug, normalizePath } from './utils'
import type { UnpluginOptions } from 'unplugin'

/**
 * Rewrites literal `preload` strings of the router's APIs in the app's own
 * files to imports of the strategies they stand for
 * (`experimental.compilePreloadStrings`). It runs before code splitting, so
 * split route components get the rewrite too. Strings it can't see still
 * load the strategies on demand at runtime.
 */
export function createRouterPreloadStringsPlugin(): UnpluginOptions {
  return {
    name: 'tanstack-router:preload-strings',
    enforce: 'pre',
    transform: {
      filter: {
        id: preloadStringsIdFilter,
        code: {
          include: preloadStringsCodeFilter,
        },
      },
      handler(code, id) {
        const filename = normalizePath(id)
        const result = compilePreloadStrings({ code, filename })
        if (result && debug) {
          logDiff(code, result.code)
        }
        return result
      },
    },
  }
}
