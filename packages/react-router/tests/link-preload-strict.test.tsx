import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import {
  Link,
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
  renderPreload,
} from '../src'
import type { PreloadOption } from '../src'

// What the bundler plugin's strict mode does: it puts the stub in place of
// the module Links run `preload` strings with
vi.mock(
  '@tanstack/router-core/preload-string',
  () => import('@tanstack/router-core/preload-string/strict'),
)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const renderLink = (preload: PreloadOption) => {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory(),
    isServer: false,
  })
  const preloadRoute = vi
    .spyOn(router, 'preloadRoute')
    .mockResolvedValue(undefined)
  render(
    <RouterContextProvider router={router}>
      <Link to="/target" preload={preload}>
        Target
      </Link>
    </RouterContextProvider>,
  )
  return preloadRoute
}

test('in strict mode, a string that reaches a Link does nothing and warns once in development', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

  expect(renderLink('render')).not.toHaveBeenCalled()
  expect(renderLink('render')).not.toHaveBeenCalled()

  expect(warn).toHaveBeenCalledOnce()
  expect(warn.mock.calls[0]![0]).toContain('preload "render"')
  expect(warn.mock.calls[0]![0]).toContain('renderPreload()')
})

test('in strict mode, imported strategies work', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

  expect(renderLink(renderPreload())).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ to: '/target' }),
  )
  expect(warn).not.toHaveBeenCalled()
})
