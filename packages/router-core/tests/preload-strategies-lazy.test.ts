import { afterEach, expect, test, vi } from 'vitest'
import { loadPreloadStrings, preloadString } from '../src'
import type { AnyRouter } from '../src'

// The built-ins' chunk fails to load once, then loads
const chunk = vi.hoisted(() => ({ failures: 1, imports: 0 }))
vi.mock('../src/preload-strategies/builtins', async (importOriginal) => {
  chunk.imports++
  if (chunk.failures > 0) {
    chunk.failures--
    throw new Error('Failed to fetch dynamically imported module')
  }
  return importOriginal()
})

const router = {} as AnyRouter
const unhandled = vi.fn()
process.on('unhandledRejection', unhandled)

afterEach(() => {
  vi.restoreAllMocks()
})

// What a Link with a string mode does as it mounts
const mountLink = (mode: string) => {
  const preload = vi.fn()
  const stop = preloadString(mode as never)(
    router,
    { current: document.createElement('a') },
    preload,
    undefined,
  )
  return { preload, stop }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 10))

test('a failed load warns once, and the next string-mode Link loads again', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const first = mountLink('render')
  const second = mountLink('render')
  await settle()

  expect(chunk.imports).toBe(1)
  expect(warn).toHaveBeenCalledTimes(1)
  expect(first.preload).not.toHaveBeenCalled()
  expect(second.preload).not.toHaveBeenCalled()

  const third = mountLink('render')
  await settle()
  expect(chunk.imports).toBe(2)
  expect(third.preload).toHaveBeenCalledTimes(1)
  expect(warn).toHaveBeenCalledTimes(1)
  expect(unhandled).not.toHaveBeenCalled()
  await expect(loadPreloadStrings()).resolves.toBeDefined()
})
