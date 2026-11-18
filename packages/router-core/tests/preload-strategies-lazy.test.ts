import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { loadPreloadStrings, preloadString } from '../src'
import type { AnyRouter } from '../src'

// The `'viewport'` chunk fails to load once, then loads; it counts its loads
const chunk = vi.hoisted(() => ({ failures: 1, imports: 0 }))
vi.mock(
  '../src/preload-strategies/strings/viewport',
  async (importOriginal) => {
    chunk.imports++
    if (chunk.failures > 0) {
      chunk.failures--
      throw new Error('Failed to fetch dynamically imported module')
    }
    return importOriginal()
  },
)

const router = { options: {} } as AnyRouter
const unhandled = vi.fn()
process.on('unhandledRejection', unhandled)

// Every observed link is in view at once
beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(target: Element) {
        this.cb(
          [{ isIntersecting: true, target } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        )
      }
      disconnect() {}
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
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

// Waits for the pending load, after the Links waiting on it: a load already
// pending isn't started again
const settle = () => loadPreloadStrings('viewport').catch(() => {})

test('intent and render load nothing', async () => {
  // Starts at once
  expect(mountLink('render').preload).toHaveBeenCalledTimes(1)
  mountLink('intent').stop?.()
  await loadPreloadStrings('intent')
  await loadPreloadStrings('render')
  expect(chunk.imports).toBe(0)
})

test('a failed load warns once, and the next viewport Link loads again', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const first = mountLink('viewport')
  const second = mountLink('viewport')
  await settle()

  expect(chunk.imports).toBe(1)
  expect(warn).toHaveBeenCalledTimes(1)
  expect(first.preload).not.toHaveBeenCalled()
  expect(second.preload).not.toHaveBeenCalled()

  // Many Links mount before the next load: one import, and each one still
  // mounted starts
  const third = mountLink('viewport')
  const fourth = mountLink('viewport')
  const gone = mountLink('viewport')
  gone.stop?.()
  await settle()
  expect(chunk.imports).toBe(2)
  expect(third.preload).toHaveBeenCalledTimes(1)
  expect(fourth.preload).toHaveBeenCalledTimes(1)
  expect(gone.preload).not.toHaveBeenCalled()
  expect(warn).toHaveBeenCalledTimes(1)
  expect(unhandled).not.toHaveBeenCalled()

  // Loaded: Links start at once, and nothing loads again
  expect(mountLink('viewport').preload).toHaveBeenCalledTimes(1)
  await expect(loadPreloadStrings()).resolves.toBeDefined()
  expect(chunk.imports).toBe(2)
})
