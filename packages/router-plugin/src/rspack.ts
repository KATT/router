import { createRspackPlugin } from 'unplugin'

import { configSchema } from './core/config'
import { createRouterCodeSplitterPlugin } from './core/router-code-splitter-plugin'
import { createRouterGeneratorPlugin } from './core/router-generator-plugin'
import { unpluginRouterComposedFactory } from './core/router-composed-plugin'
import { createRouterPluginContext } from './core/router-plugin-context'
import { createRouterPreloadStringsPlugin } from './core/router-preload-strings-plugin'
import type {
  CodeSplittingOptions,
  Config,
  PreloadStringsOptions,
} from './core/config'
import type { RouterPluginContext } from './core/router-plugin-context'

type RspackRouterPluginOptions = Partial<Config> | (() => Partial<Config>)

const defaultRouterPluginContext = createRouterPluginContext()

/**
 * @example
 * ```ts
 * export default defineConfig({
 *   // ...
 *   tools: {
 *     rspack: {
 *       plugins: [TanStackRouterGeneratorRspack()],
 *     },
 *   },
 * })
 * ```
 */
const TanStackRouterGeneratorRspack = (
  options?: RspackRouterPluginOptions,
  routerPluginContext?: RouterPluginContext,
) => {
  const pluginContext = routerPluginContext ?? defaultRouterPluginContext
  return createRspackPlugin((pluginOptions) =>
    createRouterGeneratorPlugin(
      pluginOptions as Partial<Config | (() => Config)> | undefined,
      pluginContext,
    ),
  )(options)
}

/**
 * Rspack uses webpack-compatible `import.meta.webpackHot` HMR, which the
 * code splitter emits for it.
 *
 * @example
 * ```ts
 * export default defineConfig({
 *   // ...
 *   tools: {
 *     rspack: {
 *       plugins: [TanStackRouterCodeSplitterRspack()],
 *     },
 *   },
 * })
 * ```
 */
const TanStackRouterCodeSplitterRspack = (
  options?: RspackRouterPluginOptions,
  routerPluginContext?: RouterPluginContext,
) => {
  const pluginContext = routerPluginContext ?? defaultRouterPluginContext
  return createRspackPlugin((pluginOptions) =>
    createRouterCodeSplitterPlugin(
      pluginOptions as Partial<Config | (() => Config)> | undefined,
      pluginContext,
      'webpack',
    ),
  )(options)
}

/**
 * The `experimental.compilePreloadStrings` transform on its own, for
 * integrations that compose the router's plugins themselves (TanStack
 * Start). Add it only when the option is on, and only for React. `options`
 * are the option's object form (`{}` for `true`), or a function that returns
 * them, read at each transform.
 *
 * @experimental
 */
const TanStackRouterPreloadStringsRspack = (
  options?: PreloadStringsOptions | (() => PreloadStringsOptions | undefined),
) => createRspackPlugin(createRouterPreloadStringsPlugin)(options)

/**
 * @example
 * ```ts
 * export default defineConfig({
 *   // ...
 *   tools: {
 *     rspack: {
 *       plugins: [tanstackRouter()],
 *     },
 *   },
 * })
 * ```
 */
const TanStackRouterRspack = /* #__PURE__ */ createRspackPlugin(
  unpluginRouterComposedFactory,
)
const tanstackRouter = TanStackRouterRspack
export default TanStackRouterRspack
export {
  configSchema,
  TanStackRouterRspack,
  TanStackRouterGeneratorRspack,
  TanStackRouterCodeSplitterRspack,
  TanStackRouterPreloadStringsRspack,
  tanstackRouter,
}
export type {
  Config,
  CodeSplittingOptions,
  PreloadStringsOptions,
  RouterPluginContext,
}
