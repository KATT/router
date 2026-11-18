import { createVitePlugin } from 'unplugin'

import { configSchema, getConfig } from './core/config'
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

type RouterPluginOptions = Partial<Config | (() => Config)> | undefined

const defaultRouterPluginContext = createRouterPluginContext()

/**
 * @example
 * ```ts
 * export default defineConfig({
 *   plugins: [tanstackRouterGenerator()],
 *   // ...
 * })
 * ```
 */
const tanstackRouterGenerator = (
  options?: RouterPluginOptions,
  routerPluginContext?: RouterPluginContext,
) => {
  const pluginContext = routerPluginContext ?? defaultRouterPluginContext
  return createVitePlugin((pluginOptions: RouterPluginOptions) =>
    createRouterGeneratorPlugin(pluginOptions, pluginContext),
  )(options)
}

/**
 * @example
 * ```ts
 * export default defineConfig({
 *   plugins: [tanStackRouterCodeSplitter()],
 *   // ...
 * })
 * ```
 */
const tanStackRouterCodeSplitter = (
  options?: RouterPluginOptions,
  routerPluginContext?: RouterPluginContext,
) => {
  const pluginContext = routerPluginContext ?? defaultRouterPluginContext
  return createVitePlugin((pluginOptions: RouterPluginOptions) =>
    createRouterCodeSplitterPlugin(pluginOptions, pluginContext),
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
const tanStackRouterPreloadStrings = (
  options?: PreloadStringsOptions | (() => PreloadStringsOptions | undefined),
) => createVitePlugin(createRouterPreloadStringsPlugin)(options)

/**
 * @example
 * ```ts
 * export default defineConfig({
 *   plugins: [tanstackRouter()],
 *   // ...
 * })
 * ```
 */
const tanstackRouter = createVitePlugin(unpluginRouterComposedFactory)

/**
 * @deprecated Use `tanstackRouter` instead.
 */
const TanStackRouterVite = tanstackRouter

export default tanstackRouter
export {
  configSchema,
  getConfig,
  tanStackRouterCodeSplitter,
  tanStackRouterPreloadStrings,
  tanstackRouterGenerator,
  TanStackRouterVite,
  tanstackRouter,
}

export type {
  Config,
  CodeSplittingOptions,
  PreloadStringsOptions,
  RouterPluginContext,
}
