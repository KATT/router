// @vitest-environment node
import path from 'node:path'
import { build } from 'esbuild'
import { describe, expect, test } from 'vitest'

const src = path.resolve(__dirname, '../src')

// Bundles an app that imports from the package, tree-shaken as a bundler
// would, and returns its code
const bundle = async (contents: string) => {
  const result = await build({
    stdin: { contents, resolveDir: src, loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent',
  })
  return result.outputFiles[0]!.text
}

// What `createPreloadStrategy` adds: keys sorted for its memo and a
// strategy started per router
const factoryCode = ['Object.keys(', '.sort()', 'WeakMap']

describe('built-in strategies', () => {
  test.each(['intentPreload', 'viewportPreload', 'renderPreload'])(
    '%s alone leaves out createPreloadStrategy',
    async (name) => {
      const code = await bundle(
        `import { ${name} } from './index'\nexport default ${name}()`,
      )
      expect(code).toContain(name)
      for (const piece of factoryCode) {
        expect(code).not.toContain(piece)
      }
    },
  )

  test('batchedViewportPreload uses createPreloadStrategy', async () => {
    const code = await bundle(
      `import { batchedViewportPreload } from './index'\nexport default batchedViewportPreload()`,
    )
    for (const piece of factoryCode) {
      expect(code).toContain(piece)
    }
  })
})
