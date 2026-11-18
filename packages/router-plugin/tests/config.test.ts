import path from 'node:path'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { getConfig } from '../src'
import type { Config } from '../src'

describe('getConfig', () => {
  const testCases = [
    {
      name: 'inline config',
      inlineConfig: {
        target: 'solid',
        autoCodeSplitting: false,
      } as Partial<Config>,
      withJson: false,
    },
    {
      name: `inline config and relative paths`,
      inlineConfig: {
        target: 'solid',
        autoCodeSplitting: false,
        routesDirectory: 'src/paths',
        generatedRouteTree: 'src/tree/routeTree.gen.ts',
      } as Partial<Config>,
      withJson: false,
    },
    {
      name: `inline config and "./" form relative paths`,
      inlineConfig: {
        target: 'solid',
        autoCodeSplitting: true,
        routesDirectory: './src/paths',
        generatedRouteTree: './src/tree/routeTree.gen.ts',
      } as Partial<Config>,
      withJson: false,
    },
    {
      name: 'inline config and absolute paths',
      inlineConfig: {
        target: 'solid',
        autoCodeSplitting: false,
        routesDirectory: '/src/paths',
        generatedRouteTree: '/src/tree/routeTree.gen.ts',
      } as Partial<Config>,
      withJson: false,
    },
    {
      name: 'json config',
      inlineConfig: {} as Partial<Config>,
      withJson: true,
    },
    {
      name: 'combination of json and inline config',
      inlineConfig: {
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: './src/paths',
        generatedRouteTree: './src/tree/routeTree.gen.ts',
      } as Partial<Config>,
      withJson: true,
    },
  ]

  it.each(testCases)('must resolve $name', ({ inlineConfig, withJson }) => {
    const rootPath = withJson ? 'withJson' : 'withoutJson'
    const root = path.resolve(import.meta.dirname, 'config', rootPath)

    const jsonConfig = withJson
      ? JSON.parse(readFileSync(path.resolve(root, 'tsr.config.json'), 'utf-8'))
      : undefined

    const routesPath =
      inlineConfig.routesDirectory ??
      jsonConfig?.routesDirectory ??
      'src/routes'

    const routeTreePath =
      inlineConfig.generatedRouteTree ??
      jsonConfig?.generatedRouteTree ??
      'src/routeTree.gen.ts'

    const routesDirectory = path.resolve(
      import.meta.dirname,
      'config',
      rootPath,
      routesPath,
    )

    const generatedRouteTree = path.resolve(
      import.meta.dirname,
      'config',
      rootPath,
      routeTreePath,
    )

    const resolvedConfig = getConfig(inlineConfig, root)

    expect(resolvedConfig).toEqual(
      expect.objectContaining({
        ...jsonConfig,
        ...inlineConfig,
        routesDirectory,
        generatedRouteTree,
      }),
    )
  })
})

describe('getConfig: experimental.compilePreloadStrings', () => {
  const withoutJson = path.resolve(import.meta.dirname, 'config', 'withoutJson')
  const withJson = path.resolve(
    import.meta.dirname,
    'config',
    'withExperimentalJson',
  )

  it('is absent by default', () => {
    expect(
      getConfig({}, withoutJson).experimental?.compilePreloadStrings,
    ).toBeUndefined()
  })

  it('reads the inline option', () => {
    expect(
      getConfig({ experimental: { compilePreloadStrings: true } }, withoutJson)
        .experimental,
    ).toEqual({ compilePreloadStrings: true })
  })

  it('reads tsr.config.json', () => {
    expect(getConfig({}, withJson).experimental).toEqual({
      compilePreloadStrings: true,
    })
  })

  it('merges the inline experimental options over tsr.config.json', () => {
    expect(getConfig({ experimental: {} }, withJson).experimental).toEqual({
      compilePreloadStrings: true,
    })
    expect(
      getConfig({ experimental: { compilePreloadStrings: false } }, withJson)
        .experimental,
    ).toEqual({ compilePreloadStrings: false })
  })

  const options = {
    viewport: { rootMargin: '200px', delay: 100 },
    intent: { delay: 0 },
  }

  it('reads an object of options inline', () => {
    expect(
      getConfig(
        {
          experimental: { compilePreloadStrings: { ...options, render: {} } },
        },
        withoutJson,
      ).experimental,
    ).toEqual({ compilePreloadStrings: { ...options, render: {} } })
  })

  it('reads an object of options from tsr.config.json', () => {
    const root = path.resolve(
      import.meta.dirname,
      'config',
      'withPreloadOptionsJson',
    )
    expect(getConfig({}, root).experimental).toEqual({
      compilePreloadStrings: options,
    })
    // The inline option replaces the file's
    expect(
      getConfig({ experimental: { compilePreloadStrings: true } }, root)
        .experimental,
    ).toEqual({ compilePreloadStrings: true })
  })

  it.each([
    [{ intent: { delay: '100' } }, 'intent.delay', 'expected number'],
    [{ viewport: { delay: Infinity } }, 'viewport.delay', 'expected number'],
    [{ viewport: { rootMargin: 200 } }, 'viewport.rootMargin', 'string'],
    [
      { viewport: { rootMargin: () => '200px' } },
      'viewport.rootMargin',
      'string',
    ],
    [{ viewport: { threshold: 0.5 } }, 'viewport', '"threshold"'],
    [{ render: { delay: 1 } }, 'render', '"delay"'],
    [{ hover: {} }, '', '"hover"'],
    ['viewport', '', 'Expected a boolean, or an object'],
  ])('rejects %j', (value, at, message) => {
    let error: unknown
    try {
      getConfig(
        { experimental: { compilePreloadStrings: value as never } },
        withoutJson,
      )
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(z.ZodError)
    const [issue, ...rest] = (error as z.ZodError).issues
    expect(rest).toEqual([])
    expect(issue!.path.join('.')).toBe(
      ['experimental.compilePreloadStrings', at].filter(Boolean).join('.'),
    )
    expect(issue!.message).toContain(message)
  })
})
