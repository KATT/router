import React from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import {
  intentPreload,
  loadPreloadStrategy,
  renderPreload,
  viewportPreload,
} from '@tanstack/router-core'
import {
  Link,
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '../src'

// Each test file gets its own modules, so the string modes' strategies are
// not loaded when this file starts. The tests run in order on purpose: the
// first ones see the strategies before they load.

afterEach(cleanup)

const setup = () => {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory(),
    isServer: false,
  })
  const preload = vi.spyOn(router, 'preloadRoute').mockResolvedValue(undefined)
  const link = (
    <RouterContextProvider router={router}>
      <Link to="/target" preload="render">
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
  const loading = loadPreloadStrategy('intent')
  expect(loading).toBeInstanceOf(Promise)
  expect(kept.preload).not.toHaveBeenCalled()

  await waitFor(() =>
    expect(kept.preload).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ to: '/target' }),
    ),
  )
  expect(dropped.preload).not.toHaveBeenCalled()
  // The strings are the strategies with default options: a string and its
  // imported strategy are one strategy, started once per router
  expect(await loading).toBe(intentPreload())
})

test('the strategies load once, then are there at once', () => {
  expect(loadPreloadStrategy('intent')).toBe(intentPreload())
  expect(loadPreloadStrategy('viewport')).toBe(viewportPreload())
  expect(loadPreloadStrategy('render')).toBe(renderPreload())
})

test('once they are loaded, a string-mode Link starts at once', () => {
  const { preload, link } = setup()
  render(link)

  expect(preload).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ to: '/target' }),
  )
})
