import { logDiff } from '@tanstack/router-utils'
import {
  compilePreloadStrings,
  preloadStringsCodeFilter,
} from './preload-strings'
import { debug, normalizePath } from './utils'
import type { RspackCompiler, UnpluginOptions, WebpackCompiler } from 'unplugin'

/** The module Links run `preload` strings with: it loads them on demand */
export const PRELOAD_STRING_MODULE = '@tanstack/router-core/preload-string'
/** What strict mode puts in its place: a stub that only warns in development */
export const PRELOAD_STRING_STRICT_MODULE = `${PRELOAD_STRING_MODULE}/strict`

/**
 * Points the module Links run `preload` strings with at the strict stub, in
 * webpack's or Rspack's options.
 */
function aliasForWebpack(compiler: WebpackCompiler | RspackCompiler) {
  const resolve = compiler.options.resolve
  const alias = resolve.alias
  if (Array.isArray(alias)) {
    alias.push({
      name: PRELOAD_STRING_MODULE,
      alias: PRELOAD_STRING_STRICT_MODULE,
      onlyModule: true,
    })
  } else {
    resolve.alias = {
      ...alias,
      // `$`: this module exactly, not its subpaths
      [`${PRELOAD_STRING_MODULE}$`]: PRELOAD_STRING_STRICT_MODULE,
    }
  }
}

/**
 * Rewrites literal `preload` strings in the app's own files to imports of the
 * strategies they stand for (`experimental.compilePreloadStrings`). It runs
 * before code splitting, so split route components get the rewrite too.
 *
 * In strict mode (`'strict'`), it also aliases the module Links run strings
 * with to a stub, so the app ships no code to load the built-in strategies on
 * demand. An alias, unlike a `resolveId` hook, also applies to Vite's
 * dependency pre-bundling in development.
 */
export function createRouterPreloadStringsPlugin({
  strict,
}: {
  strict: boolean
}): UnpluginOptions {
  return {
    name: 'tanstack-router:preload-strings',
    enforce: 'pre',
    ...(strict && {
      vite: {
        config: () => ({
          resolve: {
            alias: [
              {
                find: new RegExp(`^${PRELOAD_STRING_MODULE}$`),
                replacement: PRELOAD_STRING_STRICT_MODULE,
              },
            ],
          },
        }),
      },
      webpack: aliasForWebpack,
      rspack: aliasForWebpack,
    }),
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
