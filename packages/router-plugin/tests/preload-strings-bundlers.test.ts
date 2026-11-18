/**
 * `experimental.compilePreloadStrings` in real builds of each bundler the
 * plugin supports, including split route chunks where the bundler splits.
 */
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { rspack } from '@rsbuild/core'
import * as esbuild from 'esbuild'
import { build } from 'vite'
import { afterEach, describe, expect, test } from 'vitest'

const timeout = 60_000

const rootRoute = `import { createRootRoute } from '@tanstack/react-router'
export const Route = createRootRoute({})
`

const indexRoute = `import { Link, createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/')({
  component: () => <Link to="/" preload="intent" />,
})
`

const roots: Array<string> = []
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  )
})

/** Writes an app with a root and an index route, and `entry` importing it */
async function createApp() {
  // Keep the app inside the package so runtime imports resolve.
  const root = await mkdtemp(path.join(__dirname, '.preload-strings-'))
  roots.push(root)
  await mkdir(path.join(root, 'routes'))
  await writeFile(path.join(root, 'routes/__root.tsx'), rootRoute)
  await writeFile(path.join(root, 'routes/index.tsx'), indexRoute)
  await writeFile(
    path.join(root, 'entry.tsx'),
    `import { Route } from './routes/index'\nglobalThis.route = Route\n`,
  )
  return root
}

function routerOptions(root: string, autoCodeSplitting: boolean) {
  return {
    target: 'react',
    routesDirectory: path.join(root, 'routes'),
    generatedRouteTree: path.join(root, 'routeTree.gen.ts'),
    autoCodeSplitting,
    codeSplittingOptions: { addHmr: false },
    experimental: { compilePreloadStrings: true },
  } as const
}

/** The JavaScript files under `dir`, by name */
async function emitted(dir: string) {
  const files = new Map<string, string>()
  for (const file of await readdir(dir)) {
    if (file.endsWith('.js')) {
      files.set(file, await readFile(path.join(dir, file), 'utf8'))
    }
  }
  return files
}

/** The router stays external: the test reads how the app calls it */
const isRouter = (id: string) => /^@tanstack\/react-router$|^react/.test(id)

describe('esbuild', () => {
  test(
    'rewrites the route module',
    async () => {
      const root = await createApp()
      const { tanstackRouter } = await import('../src/esbuild')
      const result = await esbuild.build({
        absWorkingDir: root,
        entryPoints: ['entry.tsx'],
        bundle: true,
        write: false,
        format: 'esm',
        jsx: 'preserve',
        external: ['@tanstack/react-router', 'react'],
        plugins: [tanstackRouter(routerOptions(root, false))],
        logLevel: 'silent',
      })
      const code = result.outputFiles.map((file) => file.text).join('\n')
      expect(code).toContain('preload={intentPreload()}')
      expect(code).not.toContain('"intent"')
    },
    timeout,
  )
})

describe('rspack', () => {
  test(
    'rewrites the split route component',
    async () => {
      const root = await createApp()
      const { tanstackRouter } = await import('../src/rspack')
      const compiler = rspack({
        context: root,
        mode: 'production',
        target: 'web',
        entry: './entry.tsx',
        output: { path: path.join(root, 'dist') },
        optimization: { minimize: false },
        externals: { '@tanstack/react-router': 'TanStackRouter' },
        resolve: { extensions: ['.tsx', '.ts', '.js'] },
        module: {
          rules: [
            {
              test: /\.tsx?$/,
              loader: 'builtin:swc-loader',
              options: {
                jsc: {
                  parser: { syntax: 'typescript', tsx: true },
                  transform: { react: { runtime: 'classic' } },
                },
              },
              type: 'javascript/auto',
            },
          ],
        },
        plugins: [tanstackRouter(routerOptions(root, true))],
      })
      await new Promise<void>((resolve, reject) => {
        compiler.run((error, stats) => {
          compiler.close((closeError) => {
            if (error ?? closeError) {
              reject(error ?? closeError)
            } else if (stats?.hasErrors()) {
              reject(new Error(stats.toString({ all: false, errors: true })))
            } else {
              resolve()
            }
          })
        })
      })
      const files = await emitted(path.join(root, 'dist'))
      const [file, code] =
        [...files].find(([, chunk]) => chunk.includes('preload:')) ?? []
      expect(file, 'the chunk with the Link').toBeDefined()
      expect(file, 'the component is split').not.toBe('main.js')
      expect(code).toMatch(/preload: \(0,\s*[\w$]+\.intentPreload\)\(\)/)
      expect(code).not.toContain('"intent"')
    },
    timeout,
  )
})

describe('vite', () => {
  test(
    'rewrites the split route component',
    async () => {
      const root = await createApp()
      const { tanstackRouter } = await import('../src/vite')
      await build({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [tanstackRouter(routerOptions(root, true))],
        build: {
          minify: false,
          outDir: 'dist',
          rolldownOptions: {
            input: path.join(root, 'entry.tsx'),
            external: isRouter,
          },
        },
      })
      const files = await emitted(path.join(root, 'dist/assets'))
      const [file, code] =
        [...files].find(([, chunk]) => chunk.includes('preload:')) ?? []
      expect(file, 'the chunk with the Link').toBeDefined()
      expect(file, 'the component is split').not.toMatch(/^entry/)
      expect(code).toContain('preload: intentPreload()')
      expect(code).not.toContain('"intent"')
    },
    timeout,
  )
})
