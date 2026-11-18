import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { SourceMap } from 'node:module'
import path from 'node:path'
import ts from 'typescript'
import { createServer } from 'vite'
import { describe, expect, it, vi } from 'vitest'

import {
  compilePreloadStrings,
  preloadStringsCodeFilter,
  preloadStringsIdFilter,
} from '../src/core/preload-strings'
import { tanstackRouter } from '../src/vite'
import { formatSnapshot } from './format-snapshot'
import type { SourceMapPayload } from 'node:module'
import type { Config, PreloadStringsOptions } from '../src/core/config'
import type { Plugin } from 'vite'

const dir = path.resolve(__dirname, './preload-strings')

/** Where `map` sends the start of `marker` in `code`: 1-based line, column */
function originalPositionOf(
  code: string,
  map: SourceMapPayload,
  marker: string,
) {
  const index = code.indexOf(marker)
  expect(index, `${marker} in the output`).toBeGreaterThanOrEqual(0)
  const lines = code.slice(0, index).split('\n')
  const entry = new SourceMap(map).findEntry(
    lines.length - 1,
    lines.at(-1)!.length,
  )
  if (!('originalLine' in entry)) {
    return undefined
  }
  return { line: entry.originalLine + 1, column: entry.originalColumn }
}

/** The 1-based line and column of `marker` in `code` */
function positionOf(code: string, marker: string) {
  const lines = code.slice(0, code.indexOf(marker)).split('\n')
  return { line: lines.length, column: lines.at(-1)!.length }
}

describe('compilePreloadStrings', async () => {
  const rewritten = await readdir(path.join(dir, 'test-files', 'rewritten'))
  const unchanged = await readdir(path.join(dir, 'test-files', 'unchanged'))

  it.each(rewritten)('rewrites literal strings in "%s"', async (filename) => {
    const code = await readFile(
      path.join(dir, 'test-files', 'rewritten', filename),
      'utf-8',
    )
    expect(code).toMatch(preloadStringsCodeFilter)

    const result = compilePreloadStrings({ code, filename })

    expect(result).not.toBeNull()
    await expect(
      await formatSnapshot(result!.code, filename),
    ).toMatchFileSnapshot(path.join(dir, 'snapshots', filename))
  })

  it.each(unchanged)('leaves "%s" alone', async (filename) => {
    const code = await readFile(
      path.join(dir, 'test-files', 'unchanged', filename),
      'utf-8',
    )

    expect(compilePreloadStrings({ code, filename })).toBeNull()
  })

  it('maps the output to the source', async () => {
    const filename = 'create-router.tsx'
    const code = await readFile(
      path.join(dir, 'test-files', 'rewritten', filename),
      'utf-8',
    )

    const result = compilePreloadStrings({ code, filename })

    expect(result!.map?.sources).toEqual([filename])
  })

  it('maps a rewritten string to its line and column', () => {
    const code = `import { Link } from '@tanstack/react-router'

export const Nav = () => (
  <nav>
    <Link to="/a" preload="intent" />
  </nav>
)
`
    const result = compilePreloadStrings({ code, filename: 'nav.tsx' })!

    const map = result.map as SourceMapPayload
    expect(originalPositionOf(result.code, map, 'intentPreload()')).toEqual(
      positionOf(code, '"intent"'),
    )
    expect(
      originalPositionOf(result.code, map, 'preload={intentPreload'),
    ).toEqual(positionOf(code, 'preload="intent"'))
  })

  it('names the route file, not the split chunk, as the source', () => {
    const code = `import { Link } from '@tanstack/react-router'
export const Nav = () => <Link to="/" preload="intent" />
`
    const result = compilePreloadStrings({
      code,
      filename: '/app/routes/index.tsx?tsr-split=component',
    })

    expect(result!.map?.sources).toEqual(['/app/routes/index.tsx'])
  })
})

describe('compilePreloadStrings with options', async () => {
  // Written in another key order than the plugin's
  const options = {
    viewport: { rootMargin: '200px', delay: 100 },
    render: {},
  } satisfies PreloadStringsOptions
  const files = await readdir(path.join(dir, 'test-files', 'options'))

  it.each(files)(
    'calls the strategies with their options in "%s"',
    async (filename) => {
      const code = await readFile(
        path.join(dir, 'test-files', 'options', filename),
        'utf-8',
      )

      const result = compilePreloadStrings({ code, filename, options })

      expect(result).not.toBeNull()
      await expect(
        await formatSnapshot(result!.code, filename),
      ).toMatchFileSnapshot(path.join(dir, 'snapshots', 'options', filename))
    },
  )

  const nav = `import { Link } from '@tanstack/react-router'
export const Nav = () => <Link to="/" preload="intent" />
`
  const compile = (options?: PreloadStringsOptions) =>
    compilePreloadStrings({ code: nav, filename: 'nav.tsx', options })!.code

  it('writes falsy option values', () => {
    expect(compile({ intent: { delay: 0 } })).toMatch(
      /preload=\{intentPreload\(\{\s*delay: 0\s*\}\)\}/,
    )
  })

  it('calls a strategy without options as without the object form', () => {
    const plain = compile()
    expect(plain).toContain('preload={intentPreload()}')
    expect(compile({})).toBe(plain)
    expect(compile({ intent: {} })).toBe(plain)
    expect(compile({ intent: { delay: undefined } })).toBe(plain)
    expect(compile({ viewport: { delay: 100 } })).toBe(plain)
  })

  it.each(await readdir(path.join(dir, 'test-files', 'rewritten')))(
    'gives "%s" the same output with `{}` as without options',
    async (filename) => {
      const code = await readFile(
        path.join(dir, 'test-files', 'rewritten', filename),
        'utf-8',
      )
      expect(compilePreloadStrings({ code, filename, options: {} })!.code).toBe(
        compilePreloadStrings({ code, filename })!.code,
      )
    },
  )
})

describe('the output with options', () => {
  // The router's own options, all rewritten
  const app = `import {
  Link,
  RouterProvider,
  createRootRoute,
  createRouter,
  linkOptions,
  useLinkProps,
} from '@tanstack/react-router'

const routeTree = createRootRoute()
export const router = createRouter({ routeTree, defaultPreload: 'viewport' })
export const options = linkOptions({ to: '/', preload: 'render' })

export function App() {
  const props = useLinkProps({ to: '/', preload: 'intent' })
  return (
    <>
      <a {...props} />
      <Link to="/" preload="viewport" />
      <RouterProvider router={router} defaultPreload="intent" />
    </>
  )
}
`

  /**
   * The TypeScript errors of `app` compiled with `options`, checked against
   * the types of `@tanstack/react-router`
   */
  async function typeErrors(options: PreloadStringsOptions) {
    const result = compilePreloadStrings({
      code: app,
      filename: 'app.tsx',
      options,
    })
    expect(result).not.toBeNull()
    // Inside the package, so `@tanstack/react-router` resolves
    const root = await mkdtemp(path.join(__dirname, '.preload-strings-'))
    try {
      const file = path.join(root, 'app.tsx')
      await writeFile(file, result!.code)
      const program = ts.createProgram([file], {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2022,
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
      })
      return ts
        .getPreEmitDiagnostics(program)
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }

  it('type-checks against the options of the strategies', async () => {
    expect(
      await typeErrors({
        intent: { delay: 0 },
        viewport: { delay: 100, rootMargin: '200px' },
        render: {},
      }),
    ).toEqual([])
  }, 60_000)

  it('fails to type-check with options the strategies do not take', async () => {
    // (The config schema rejects these)
    const errors = await typeErrors({
      viewport: { rootMargin: 200 },
    } as unknown as PreloadStringsOptions)
    // At `createRouter` and at `<Link>`
    expect(errors).toEqual(
      Array(2).fill("Type 'number' is not assignable to type 'string'."),
    )
  }, 60_000)
})

describe('preloadStringsCodeFilter', () => {
  it('needs the router import, a preload key and a string mode', () => {
    const routerImport = `import { Link } from '@tanstack/react-router'\n`
    expect(`${routerImport}<Link preload="intent" />`).toMatch(
      preloadStringsCodeFilter,
    )
    expect(`${routerImport}({ defaultPreload: 'render' })`).toMatch(
      preloadStringsCodeFilter,
    )
    expect(`<Link preload="intent" />`).not.toMatch(preloadStringsCodeFilter)
    expect(`${routerImport}<Link to="/intent" />`).not.toMatch(
      preloadStringsCodeFilter,
    )
    expect(`${routerImport}<Link preload={false} />`).not.toMatch(
      preloadStringsCodeFilter,
    )
  })

  it('takes linear time on many preload keys and no string mode', () => {
    // Unanchored, `preload[\s\S]*'intent'` scans the rest of the file again
    // from every `preload`
    const code = `import '@tanstack/react-router'\n${'preload: x,\n'.repeat(100_000)}`
    const start = performance.now()
    expect(code).not.toMatch(preloadStringsCodeFilter)
    expect(performance.now() - start).toBeLessThan(1_000)
  })
})

describe('preloadStringsIdFilter', () => {
  const matches = (id: string) =>
    preloadStringsIdFilter.include.test(id) &&
    !preloadStringsIdFilter.exclude.test(id)

  it.each([
    '/app/src/router.ts',
    '/app/src/router.tsx',
    '/app/src/router.js',
    '/app/src/router.jsx',
    '/app/src/router.mjs',
    '/app/src/router.cjs',
    '/app/src/router.mts',
    '/app/src/router.cts',
    '/app/src/routes/index.tsx?tsr-split=component',
    '/app/src/routes/index.tsx?tsr-shared=1',
    'C:\\app\\src\\r.tsx?tsr-split=component',
    'C:\\app\\src\\r.tsx',
  ])('includes %s', (id) => {
    expect(matches(id)).toBe(true)
  })

  it.each([
    '/app/node_modules/@tanstack/react-router/dist/esm/index.js',
    'C:\\app\\node_modules\\lib\\index.js',
    'C:\\app\\node_modules\\lib\\index.tsx?tsr-split=component',
    '/app/src/App.vue',
    '/app/src/App.vue?vue&type=script&setup=true&lang.ts',
    // MDX compiles to JSX in its own plugin: its strings stay
    '/app/src/post.mdx',
    '/app/index.html',
    '/app/src/styles.css',
  ])('excludes %s', (id) => {
    expect(matches(id)).toBe(false)
  })
})

/** The names of the plugins the Vite plugin makes for `options` */
function pluginNames(options: Partial<Config> | (() => Config)) {
  return ([tanstackRouter(options)].flat() as Array<Plugin>).map(
    (plugin) => plugin.name,
  )
}

describe('the Vite plugin', () => {
  const flag = { experimental: { compilePreloadStrings: true } }

  it('adds the transform for React, before code splitting', () => {
    const names = pluginNames({
      target: 'react',
      autoCodeSplitting: true,
      ...flag,
    })
    expect(names).toContain('tanstack-router:preload-strings')
    expect(names.indexOf('tanstack-router:preload-strings')).toBeLessThan(
      names.indexOf('tanstack-router:code-splitter:compile-reference-file'),
    )
  })

  it('adds the transform before HMR without code splitting', () => {
    const names = pluginNames({
      target: 'react',
      autoCodeSplitting: false,
      ...flag,
    })
    expect(names.indexOf('tanstack-router:preload-strings')).toBeLessThan(
      names.indexOf('tanstack-router:hmr'),
    )
  })

  it.each(['solid', 'vue'] as const)('leaves it out for %s', (target) => {
    expect(pluginNames({ target, ...flag })).not.toContain(
      'tanstack-router:preload-strings',
    )
  })

  it('adds the transform for an object of options', () => {
    expect(
      pluginNames({
        target: 'react',
        experimental: { compilePreloadStrings: { intent: { delay: 0 } } },
      }),
    ).toContain('tanstack-router:preload-strings')
  })

  it('leaves it out by default', () => {
    expect(pluginNames({ target: 'react' })).not.toContain(
      'tanstack-router:preload-strings',
    )
  })

  it('reads function options once', () => {
    // (The generator and the code splitter read them again when they start)
    const options = vi.fn(
      () => ({ target: 'react', autoCodeSplitting: true, ...flag }) as Config,
    )
    expect(pluginNames(options)).toContain('tanstack-router:preload-strings')
    expect(options).toHaveBeenCalledTimes(1)
  })
})

const rootRoute = `import { createRootRoute } from '@tanstack/react-router'
export const Route = createRootRoute({})
`

/**
 * Serves a temporary app whose index route is `route` with Vite's dev server
 * and the router plugin, with `options` and the flag on, for `use`.
 */
async function withDevServer<T>(
  route: string,
  options: Partial<Config>,
  use: (server: {
    transform: (url: string) => Promise<{ code: string; map: unknown }>
    writeRoute: (code: string) => Promise<void>
  }) => Promise<T>,
) {
  // Keep the temporary app inside the package so runtime imports resolve.
  const root = await mkdtemp(path.join(__dirname, '.preload-strings-'))
  try {
    await mkdir(path.join(root, 'routes'))
    await writeFile(path.join(root, 'routes/__root.tsx'), rootRoute)
    const routeFile = path.join(root, 'routes/index.tsx')
    await writeFile(routeFile, route)
    const server = await createServer({
      root,
      configFile: false,
      logLevel: 'silent',
      server: { watch: null },
      plugins: [
        tanstackRouter({
          target: 'react',
          routesDirectory: './routes',
          generatedRouteTree: './routeTree.gen.ts',
          autoCodeSplitting: true,
          experimental: { compilePreloadStrings: true },
          ...options,
          codeSplittingOptions: {
            addHmr: false,
            ...options.codeSplittingOptions,
          },
        }),
      ],
    })
    try {
      return await use({
        async transform(url) {
          const result = await server.transformRequest(url)
          expect(result, url).toBeTruthy()
          return { code: result!.code, map: result!.map }
        },
        async writeRoute(code) {
          await writeFile(routeFile, code)
          // As Vite's watcher does: the route module and its split chunks
          for (const module of server.moduleGraph.getModulesByFile(routeFile) ??
            []) {
            server.moduleGraph.invalidateModule(module)
          }
        },
      })
    } finally {
      await server.close()
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

/** The ids with `query` that `code` imports */
function importsWith(code: string, query: string) {
  return [...code.matchAll(/["']([^"'\s]+)["']/g)]
    .map(([, specifier]) => specifier!)
    .filter((specifier) => specifier.includes(query))
}

describe('experimental.compilePreloadStrings', () => {
  const linkRoute = `import { Link, createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/')({
  component: () => <Link to="/" preload="intent" />,
})
`

  // Builds a temporary app with one route that uses `preload="intent"` and
  // returns its split route component, transformed with the flag
  const transformRoute = async (flag: boolean) =>
    withDevServer(
      linkRoute,
      { experimental: { compilePreloadStrings: flag } },
      async ({ transform }) => {
        await transform('/routes/index.tsx')
        return (await transform('/routes/index.tsx?tsr-split=component')).code
      },
    )

  it('rewrites split route components when on', async () => {
    const code = await transformRoute(true)
    expect(code).toContain('intentPreload()')
    expect(code).not.toContain('"intent"')
  }, 30_000)

  it('calls the strategies with the options of the object form', async () => {
    await withDevServer(
      linkRoute.replace('"intent"', '"viewport"'),
      {
        experimental: {
          compilePreloadStrings: {
            viewport: { rootMargin: '200px', delay: 100 },
          },
        },
      },
      async ({ transform }) => {
        await transform('/routes/index.tsx')
        const { code } = await transform(
          '/routes/index.tsx?tsr-split=component',
        )
        expect(code).toMatch(
          /viewportPreload\(\{\s*delay: 100,\s*rootMargin: ["']200px["']\s*\}\)/,
        )
        expect(code).not.toContain('"viewport"')
      },
    )
  }, 30_000)

  it('is off by default', async () => {
    const code = await transformRoute(false)
    expect(code).not.toContain('intentPreload')
    expect(code).toContain('"intent"')
  }, 30_000)

  it('maps a rewritten string in a split component to its line and column', async () => {
    await withDevServer(linkRoute, {}, async ({ transform }) => {
      await transform('/routes/index.tsx')
      const { code, map } = await transform(
        '/routes/index.tsx?tsr-split=component',
      )
      expect(
        originalPositionOf(code, map as SourceMapPayload, 'intentPreload()'),
      ).toEqual(positionOf(linkRoute, '"intent"'))
    })
  }, 30_000)

  it('rewrites options the route and its split component share', async () => {
    const route = `import { Link, createFileRoute, linkOptions } from '@tanstack/react-router'
const home = linkOptions({ to: '/', preload: 'intent' })
export const Route = createFileRoute('/')({
  loader: () => home.to,
  component: () => <Link {...home} />,
})
`
    await withDevServer(route, {}, async ({ transform }) => {
      const reference = (await transform('/routes/index.tsx')).code
      const [shared] = importsWith(reference, 'tsr-shared=')
      expect(shared, 'the shared module').toBeDefined()
      const sharedCode = (await transform(shared!)).code
      expect(sharedCode).toContain('preload: intentPreload()')
      expect(sharedCode).not.toContain('"intent"')
      // Defined once, in the shared module
      for (const code of [
        reference,
        (await transform('/routes/index.tsx?tsr-split=component')).code,
      ]) {
        expect(code).not.toContain('linkOptions(')
      }
    })
  }, 30_000)

  it('rewrites split chunks of custom groupings', async () => {
    const route = `import { Link, createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/')({
  loader: () => 'data',
  component: () => <Link to="/" preload="viewport" />,
})
`
    await withDevServer(
      route,
      { codeSplittingOptions: { defaultBehavior: [['loader', 'component']] } },
      async ({ transform }) => {
        const reference = (await transform('/routes/index.tsx')).code
        const [split] = importsWith(reference, 'tsr-split=component---loader')
        expect(split, 'the split chunk').toBeDefined()
        const code = (await transform(split!)).code
        expect(code).toContain('viewportPreload()')
        expect(code).not.toContain('"viewport"')
      },
    )
  }, 30_000)

  it('rewrites route modules with code splitting HMR', async () => {
    await withDevServer(
      linkRoute,
      { codeSplittingOptions: { addHmr: true } },
      async ({ transform }) => {
        const reference = (await transform('/routes/index.tsx')).code
        expect(reference).toContain('import.meta.hot')
        const code = (await transform('/routes/index.tsx?tsr-split=component'))
          .code
        expect(code).toContain('intentPreload()')
        expect(code).not.toContain('"intent"')
      },
    )
  }, 30_000)

  it('rewrites route modules before HMR without code splitting', async () => {
    await withDevServer(
      linkRoute,
      { autoCodeSplitting: false },
      async ({ transform }) => {
        const { code } = await transform('/routes/index.tsx')
        expect(code).toContain('import.meta.hot')
        expect(code).toContain('intentPreload()')
        expect(code).not.toContain('"intent"')
      },
    )
  }, 30_000)

  it('rewrites a route again when it changes', async () => {
    await withDevServer(linkRoute, {}, async ({ transform, writeRoute }) => {
      const split = '/routes/index.tsx?tsr-split=component'
      await transform('/routes/index.tsx')
      expect((await transform(split)).code).toContain('intentPreload()')

      await writeRoute(linkRoute.replace('"intent"', '"render"'))
      await transform('/routes/index.tsx')
      const code = (await transform(split)).code
      expect(code).toContain('renderPreload()')
      expect(code).not.toContain('intentPreload')
    })
  }, 30_000)
})
