import { logDiff } from '@tanstack/router-utils'
import {
  compilePreloadStrings,
  preloadStringsCodeFilter,
} from './preload-strings'
import { debug, normalizePath } from './utils'
import type { UnpluginOptions } from 'unplugin'

/**
 * Rewrites literal `preload` strings in the app's own files to imports of the
 * strategies they stand for (`experimental.compilePreloadStrings`). It runs
 * before code splitting, so split route components get the rewrite too.
 * Strings it can't see still load the strategies on demand at runtime.
 */
export function createRouterPreloadStringsPlugin(): UnpluginOptions {
  return {
    name: 'tanstack-router:preload-strings',
    enforce: 'pre',
    transform: {
      filter: {
        id: {
          // Also split route chunks, eg. `route.tsx?tsr-split=component`.
          // `.html` is left out for webpack / Rspack.
          include: /\.(m|c)?(j|t)sx?(\?|$)/,
          exclude: /[\\/]node_modules[\\/]/,
        },
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
