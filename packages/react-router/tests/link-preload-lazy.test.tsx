import React from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import {
  Link,
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '../src'

// Links load the strategies for `preload` strings on demand. Each test file
// gets its own modules, so they are not loaded when this file starts. The
// tests run in order on purpose: the first one sees the strategies before
// they load.

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
