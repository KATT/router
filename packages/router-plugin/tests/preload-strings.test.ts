import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { createServer } from 'vite'
import { describe, expect, it } from 'vitest'

import {
  compilePreloadStrings,
  preloadStringsCodeFilter,
} from '../src/core/preload-strings'
import { tanstackRouter } from '../src/vite'
import { formatSnapshot } from './format-snapshot'

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
  const transformRoute = async (compilePreloadStrings: boolean) => {
    // Keep the temporary app inside the package so runtime imports resolve.
    const root = await mkdtemp(path.join(__dirname, '.preload-strings-'))
    let server: Awaited<ReturnType<typeof createServer>> | undefined
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
      server = await createServer({
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
            codeSplittingOptions: { addHmr: false },
            experimental: { compilePreloadStrings },
          }),
        ],
      })
      await server.transformRequest('/routes/index.tsx')
      const split = await server.transformRequest(
        '/routes/index.tsx?tsr-split=component',
      )
      return split!.code
    } finally {
      await server?.close()
      await rm(root, { recursive: true, force: true })
    }
  }

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
})
