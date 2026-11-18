import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { build, createServer } from 'vite'
import { describe, expect, it } from 'vitest'

import {
  compilePreloadStrings,
  preloadStringsCodeFilter,
} from '../src/core/preload-strings'
import { tanstackRouter } from '../src/vite'
import { formatSnapshot } from './format-snapshot'
import type { PluginOption, Rolldown, ViteDevServer } from 'vite'

const dir = path.resolve(__dirname, './preload-strings')

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
})

describe('experimental.compilePreloadStrings', () => {
  type Flag = boolean | 'strict'

  // A temporary app with one route that uses `preload="intent"`, and the
  // router plugin with the flag
  const withApp = async <T>(
    flag: Flag,
    use: (root: string, plugins: Array<PluginOption>) => Promise<T>,
  ) => {
    // Keep the temporary app inside the package so runtime imports resolve.
    const root = await mkdtemp(path.join(__dirname, '.preload-strings-'))
    try {
      await mkdir(path.join(root, 'routes'))
      await writeFile(
        path.join(root, 'routes/__root.tsx'),
        `import { createRootRoute } from '@tanstack/react-router'
export const Route = createRootRoute({})`,
      )
      await writeFile(
        path.join(root, 'routes/index.tsx'),
        `import { Link, createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/')({
  component: () => <Link to="/" preload="intent" />,
})`,
      )
      // What Links run strings with
      await writeFile(
        path.join(root, 'main.ts'),
        `import { preloadString } from '@tanstack/router-core/preload-string'
console.log(preloadString)`,
      )
      return await use(root, [
        tanstackRouter({
          target: 'react',
          routesDirectory: './routes',
          generatedRouteTree: './routeTree.gen.ts',
          autoCodeSplitting: true,
          codeSplittingOptions: { addHmr: false },
          experimental: { compilePreloadStrings: flag },
        }),
      ])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }

  const withServer = <T>(
    flag: Flag,
    use: (server: ViteDevServer) => Promise<T>,
  ) =>
    withApp(flag, async (root, plugins) => {
      const server = await createServer({
        root,
        configFile: false,
        logLevel: 'silent',
        server: { watch: null },
        plugins,
      })
      try {
        return await use(server)
      } finally {
        await server.close()
      }
    })

  const transformRoute = (flag: Flag) =>
    withServer(flag, async (server) => {
      await server.transformRequest('/routes/index.tsx')
      const split = await server.transformRequest(
        '/routes/index.tsx?tsr-split=component',
      )
      return split!.code
    })

  // The file Links' `preload-string` import resolves to in development
  const resolvePreloadString = (flag: Flag) =>
    withServer(flag, async (server) => {
      const resolved =
        await server.environments.client.pluginContainer.resolveId(
          '@tanstack/router-core/preload-string',
          path.join(server.config.root, 'main.ts'),
        )
      return path.basename(resolved!.id)
    })

  // The chunks a production build of `main.ts` emits
  const buildChunks = (flag: Flag) =>
    withApp(flag, async (root, plugins) => {
      const result = (await build({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins,
        build: { write: false, rollupOptions: { input: 'main.ts' } },
      })) as Rolldown.RolldownOutput
      return result.output.filter((chunk) => chunk.type === 'chunk')
    })

  it('rewrites split route components when on', async () => {
    const code = await transformRoute(true)
    expect(code).toContain('intentPreload()')
    expect(code).not.toContain('"intent"')
  }, 30_000)

  it('is off by default', async () => {
    const code = await transformRoute(false)
    expect(code).not.toContain('intentPreload')
    expect(code).toContain('"intent"')
  }, 30_000)

  it("rewrites the same way in 'strict' mode", async () => {
    const code = await transformRoute('strict')
    expect(code).toContain('intentPreload()')
    expect(code).not.toContain('"intent"')
  }, 30_000)

  it("puts the stub in place of the on-demand loader in 'strict' mode only", async () => {
    expect(await resolvePreloadString(true)).toBe('lazy.js')
    expect(await resolvePreloadString('strict')).toBe('strict.js')
  }, 30_000)

  it("emits no on-demand chunk in 'strict' mode", async () => {
    const lazy = await buildChunks(true)
    expect(lazy.map((chunk) => chunk.name)).toEqual(['main', 'builtins'])
    expect(lazy[0]!.code).toContain('import(')

    const strict = await buildChunks('strict')
    expect(strict.map((chunk) => chunk.name)).toEqual(['main'])
    expect(strict[0]!.code).not.toContain('import(')
  }, 30_000)
})
