import React from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  Link,
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '../src'

// Links load the strategy for `'viewport'` on demand. Each test file gets
// its own modules, so it is not loaded when this file starts. The tests run
// in order on purpose: the first one sees the strategy before it loads.

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
  cleanup()
})

const setup = () => {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory(),
    isServer: false,
  })
  const preload = vi.spyOn(router, 'preloadRoute').mockResolvedValue(undefined)
  const link = (
    <RouterContextProvider router={router}>
      <Link to="/target" preload="viewport" preloadDelay={0}>
        Target
      </Link>
    </RouterContextProvider>
  )
  return { preload, link }
}

test('a string-mode Link preloads once its strategy loads, one that unmounted first starts nothing', async () => {
  const kept = setup()
  const dropped = setup()
  render(kept.link)
  render(dropped.link).unmount()

  // Rendering started the load; nothing preloads before it's done
  expect(kept.preload).not.toHaveBeenCalled()

  await waitFor(() =>
    expect(kept.preload).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ to: '/target' }),
    ),
  )
  expect(dropped.preload).not.toHaveBeenCalled()
})

test('once they are loaded, a string-mode Link starts at once', () => {
  const { preload, link } = setup()
  render(link)

  expect(preload).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ to: '/target' }),
  )
})
