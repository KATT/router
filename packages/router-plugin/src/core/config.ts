import { existsSync, readFileSync } from 'node:fs'
import { z } from 'zod'
import {
  configSchema as generatorConfigSchema,
  getConfig as getGeneratorConfig,
  resolveConfigPath,
} from '@tanstack/router-generator'
import type {
  CreateFileRoute,
  IntentPreloadOptions,
  RegisteredRouter,
  RouteIds,
  ViewportPreloadOptions,
} from '@tanstack/router-core'
import type { CodeSplitGroupings } from './constants'

export const splitGroupingsSchema = z
  .array(
    z.array(
      z.union([
        z.literal('loader'),
        z.literal('component'),
        z.literal('pendingComponent'),
        z.literal('errorComponent'),
        z.literal('notFoundComponent'),
      ]),
    ),
    {
      message:
        "  Must be an Array of Arrays containing the split groupings. i.e. [['component'], ['pendingComponent'], ['errorComponent', 'notFoundComponent']]",
    },
  )
  .superRefine((val, ctx) => {
    const flattened = val.flat()
    const unique = [...new Set(flattened)]

    // Elements must be unique,
    // ie. this shouldn't be allows [['component'], ['component', 'loader']]
    if (unique.length !== flattened.length) {
      ctx.addIssue({
        code: 'custom',
        message:
          "  Split groupings must be unique and not repeated. i.e. i.e. [['component'], ['pendingComponent'], ['errorComponent', 'notFoundComponent']]." +
          `\n  You input was: ${JSON.stringify(val)}.`,
      })
    }
  })

export type CodeSplittingOptions = {
  /**
   * Use this function to programmatically control the code splitting behavior
   * based on the `routeId` for each route.
   *
   * If you just need to change the default behavior, you can use the `defaultBehavior` option.
   * @param params
   */
  splitBehavior?: (params: {
    routeId: RouteIds<RegisteredRouter['routeTree']>
  }) => CodeSplitGroupings | undefined | void

  /**
   * The default/global configuration to control your code splitting behavior per route.
   * @default [['component'],['pendingComponent'],['errorComponent'],['notFoundComponent']]
   */
  defaultBehavior?: CodeSplitGroupings

  /**
   * The nodes that shall be deleted from the route.
   * @default undefined
   */
  deleteNodes?: Array<DeletableNodes>

  /**
   * @default true
   */
  addHmr?: boolean
}

const codeSplittingOptionsSchema = z.object({
  splitBehavior: z
    .custom<
      CodeSplittingOptions['splitBehavior']
    >((value) => typeof value === 'function')
    .optional(),
  defaultBehavior: splitGroupingsSchema.optional(),
  deleteNodes: z.array(z.string()).optional(),
  addHmr: z.boolean().optional().default(true),
})

type FileRouteKeys = keyof (Parameters<
  CreateFileRoute<any, any, any, any, any>
>[0] & {})
export type DeletableNodes = FileRouteKeys | (string & {})

/**
 * The options of the built-in strategies the plugin rewrites the string
 * modes to, written into the code at build time, eg.
 * `viewport: { rootMargin: '200px' }` makes `preload="viewport"`
 * `viewportPreload({ rootMargin: '200px' })`.
 * @experimental
 */
export interface PreloadStringsOptions {
  /** The options of `intentPreload` for `'intent'` */
  intent?: IntentPreloadOptions
  /** The options of `viewportPreload` for `'viewport'` */
  viewport?: ViewportPreloadOptions
  /** `renderPreload` takes no options */
  render?: Record<string, never>
}

// JSON values only: the plugin writes them into the code
const preloadStringsOptionsSchema: z.ZodType<PreloadStringsOptions> =
  z.strictObject({
    intent: z.strictObject({ delay: z.number().optional() }).optional(),
    viewport: z
      .strictObject({
        delay: z.number().optional(),
        rootMargin: z.string().optional(),
      })
      .optional(),
    render: z.strictObject({}).optional(),
  })

/**
 * `true`, `false` or the options. Not a `z.union`: its error would list why
 * the options aren't a boolean too.
 */
const compilePreloadStringsSchema = z
  .custom<boolean | PreloadStringsOptions>()
  .superRefine((typed, ctx) => {
    // `z.custom` without a check lets any value through to here
    const value: unknown = typed
    if (typeof value === 'boolean') {
      return
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      ctx.addIssue({
        code: 'custom',
        message: `Expected a boolean, or an object with options for 'intent', 'viewport' and 'render', received ${JSON.stringify(value)}`,
      })
      return
    }
    const result = preloadStringsOptionsSchema.safeParse(value)
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, code: 'custom' })
      }
    }
  })

/**
 * The options of `experimental.compilePreloadStrings` when it's on (`{}` for
 * `true`), `undefined` when it's off.
 */
export function getPreloadStringsOptions(
  value: boolean | PreloadStringsOptions | undefined,
): PreloadStringsOptions | undefined {
  if (!value) {
    return undefined
  }
  return value === true ? {} : value
}

export const configSchema = generatorConfigSchema.extend({
  codeSplittingOptions: z
    .custom<CodeSplittingOptions>((v) => {
      return codeSplittingOptionsSchema.parse(v)
    })
    .optional(),
  plugin: z
    .object({
      vite: z
        .object({
          environmentName: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  experimental: z
    .object({
      // TODO: This has been made stable and is now "autoCodeSplitting". Remove in next major version.
      enableCodeSplitting: z.boolean().optional(),
      /**
       * Rewrites literal `preload` strings of the router's options in your
       * files (`<Link>`, `createLink` components, `<RouterProvider>`,
       * `createRouter`, `linkOptions` and `useLinkProps` from
       * `@tanstack/react-router`) to imports of the strategies they stand
       * for, eg. `<Link preload="intent" />` to
       * `<Link preload={intentPreload()} />` and `defaultPreload: 'viewport'`
       * to `defaultPreload: viewportPreload()`. The app then ships only the
       * strategies it uses, and Links don't load them on demand. Strings the
       * plugin can't see, eg. from a variable or a library, still load the
       * strategies on demand. React only.
       *
       * An object turns it on with options for the strategies it rewrites
       * to, eg. `{ viewport: { rootMargin: '200px', delay: 100 } }` makes
       * `preload="viewport"`
       * `viewportPreload({ delay: 100, rootMargin: '200px' })`. They're
       * written into the code at build time, so they apply only to the
       * strings the plugin rewrites: strings it can't see load the
       * strategies with their default options.
       * @experimental
       * @default false
       */
      compilePreloadStrings: compilePreloadStringsSchema.optional(),
    })
    .optional(),
})

/** The `experimental` options of `tsr.config.json` in `root`, as written */
function getFileExperimentalOptions(root: string) {
  const file = resolveConfigPath({ configDirectory: root })
  if (!existsSync(file)) {
    return undefined
  }
  return (JSON.parse(readFileSync(file, 'utf-8')) as Partial<Config>)
    .experimental
}

export const getConfig = (inlineConfig: Partial<Config>, root: string) => {
  const config = getGeneratorConfig(inlineConfig, root)

  // The generator's own schema drops the plugin's experimental options, so
  // they come from `tsr.config.json` and the inline options (which win)
  return configSchema.parse({
    ...inlineConfig,
    ...config,
    experimental: {
      ...getFileExperimentalOptions(root),
      ...config.experimental,
      ...inlineConfig.experimental,
    },
  })
}

export type Config = z.infer<typeof configSchema>
export type ConfigInput = z.input<typeof configSchema>
export type ConfigOutput = z.output<typeof configSchema>
