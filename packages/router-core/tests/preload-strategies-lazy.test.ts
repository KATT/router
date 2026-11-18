import { afterEach, expect, test, vi } from 'vitest'
import { loadPreloadStrings, preloadString } from '../src'
import type { AnyRouter } from '../src'

// The `'render'` chunk fails to load once, then loads
const chunk = vi.hoisted(() => ({ failures: 1, imports: 0 }))
vi.mock('../src/preload-strategies/strings/render', async (importOriginal) => {
  chunk.imports++
  if (chunk.failures > 0) {
    chunk.failures--
    throw new Error('Failed to fetch dynamically imported module')
  }
  return importOriginal()
})
// The other chunk counts its loads
const others = vi.hoisted(() => ({ viewport: 0 }))
vi.mock('../src/preload-strategies/strings/viewport', (importOriginal) => {
  others.viewport++
  return importOriginal()
})

const router = { options: {} } as AnyRouter
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

// Waits for a string's pending load, after the Links waiting on it: a load
// already pending isn't started again
const settle = (mode: 'intent' | 'viewport' | 'render') =>
  loadPreloadStrings(mode).catch(() => {})

test('a failed load warns once, and the next string-mode Link loads again', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const first = mountLink('render')
  const second = mountLink('render')
  await settle('render')

  expect(chunk.imports).toBe(1)
  expect(warn).toHaveBeenCalledTimes(1)
  expect(first.preload).not.toHaveBeenCalled()
  expect(second.preload).not.toHaveBeenCalled()

  // Many Links mount before the next load: one import, and each one still
  // mounted starts
  const third = mountLink('render')
  const fourth = mountLink('render')
  const gone = mountLink('render')
  gone.stop?.()
  await settle('render')
  expect(chunk.imports).toBe(2)
  expect(third.preload).toHaveBeenCalledTimes(1)
  expect(fourth.preload).toHaveBeenCalledTimes(1)
  expect(gone.preload).not.toHaveBeenCalled()
  expect(warn).toHaveBeenCalledTimes(1)
  expect(unhandled).not.toHaveBeenCalled()
  // Only the string the Links use loaded
  expect(others).toEqual({ viewport: 0 })
})

test('each string loads its own chunk, once, when its first Link mounts', async () => {
  const first = mountLink('viewport')
  const second = mountLink('viewport')
  expect(others).toEqual({ viewport: 0 })
  await settle('viewport')
  expect(others).toEqual({ viewport: 1 })
  // A React Link runs `'intent'` itself: it has no chunk
  mountLink('intent').stop?.()
  await settle('intent')
  expect(others).toEqual({ viewport: 1 })
  first.stop?.()
  second.stop?.()
  await expect(loadPreloadStrings()).resolves.toBeDefined()
  expect(others).toEqual({ viewport: 1 })
  expect(chunk.imports).toBe(2)
})
