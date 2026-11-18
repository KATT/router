import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parseStartConfig as parseViteStartConfig } from '../src/vite/schema'
import { parseStartConfig as parseRsbuildStartConfig } from '../src/rsbuild/schema'

const root = process.cwd()
const corePluginOpts = { framework: 'react' as const }

describe('start config schema', () => {
  test('uses Start route defaults relative to srcDirectory', () => {
    const config = parseViteStartConfig({}, corePluginOpts, root)

    expect(config.router.routesDirectory).toBe(
      path.resolve(root, 'src', 'routes'),
    )
    expect(config.router.generatedRouteTree).toBe(
      path.resolve(root, 'src', 'routeTree.gen.ts'),
    )
  })

  test('uses router path overrides relative to srcDirectory', () => {
    const config = parseRsbuildStartConfig(
      {
        srcDirectory: 'app',
        router: {
          routesDirectory: 'pages',
          generatedRouteTree: 'routes.gen.ts',
        },
      },
      corePluginOpts,
      root,
    )

    expect(config.router.routesDirectory).toBe(
      path.resolve(root, 'app', 'pages'),
    )
    expect(config.router.generatedRouteTree).toBe(
      path.resolve(root, 'app', 'routes.gen.ts'),
    )
  })

  test.each([
    ['Vite', parseViteStartConfig],
    ['Rsbuild', parseRsbuildStartConfig],
  ])(
    '%s: keeps the options of router.experimental.compilePreloadStrings',
    (_, parse) => {
      const compilePreloadStrings = {
        viewport: { rootMargin: '200px', delay: 100 },
        intent: { delay: 0 },
      }
      const config = parse(
        { router: { experimental: { compilePreloadStrings } } },
        corePluginOpts,
        root,
      )

      expect(config.router.experimental?.compilePreloadStrings).toEqual(
        compilePreloadStrings,
      )
    },
  )

  test.each([
    ['Vite', parseViteStartConfig],
    ['Rsbuild', parseRsbuildStartConfig],
  ])(
    '%s: rejects options of router.experimental.compilePreloadStrings the plugin cannot write into the code',
    (_, parse) => {
      expect(() =>
        parse(
          {
            router: {
              experimental: {
                compilePreloadStrings: {
                  viewport: { rootMargin: 200 as unknown as string },
                },
              },
            },
          },
          corePluginOpts,
          root,
        ),
      ).toThrow(/expected string, received number/)
    },
  )
})
