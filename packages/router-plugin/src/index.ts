export {
  configSchema,
  getConfig,
  getPreloadStringsOptions,
} from './core/config'
export { unpluginRouterGeneratorFactory } from './core/router-generator-plugin'
export { createRouterPluginContext } from './core/router-plugin-context'
export type {
  Config,
  ConfigInput,
  ConfigOutput,
  CodeSplittingOptions,
  DeletableNodes,
  PreloadStringsOptions,
} from './core/config'
export type { RouterPluginContext } from './core/router-plugin-context'
export {
  tsrSplit,
  splitRouteIdentNodes,
  defaultCodeSplitGroupings,
} from './core/constants'
