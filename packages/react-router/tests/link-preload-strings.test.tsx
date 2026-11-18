import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { stringStrategy } from '@tanstack/router-core'
import {
  Link,
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '../src'
import type * as Core from '@tanstack/router-core'

// Spies on how Links look up the strategies of `'viewport'` and `'render'`
vi.mock('@tanstack/router-core', async (importOriginal) => {
  const core = await importOriginal<typeof Core>()
  return { ...core, stringStrategy: vi.fn(core.stringStrategy) }
})

let observed: Map<Element, IntersectionObserverCallback>
beforeEach(() => {
  observed = new Map()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(element: Element) {
        observed.set(element, this.cb)
      }
      unobserve(element: Element) {
        observed.delete(element)
      }
      disconnect() {
        observed.forEach((cb, element) => {
          if (cb === this.cb) {
            observed.delete(element)
          }
        })
      }
      takeRecords() {
        return []
      }
    },
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.mocked(stringStrategy).mockClear()
  cleanup()
})

const setup = (isServer = false) => {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory(),
    isServer,
  })
  const preload = vi.spyOn(router, 'preloadRoute').mockResolvedValue(undefined)
  const wrap = (ui: React.ReactNode) => (
    <RouterContextProvider router={router}>{ui}</RouterContextProvider>
  )
  return { router, preload, wrap }
}

test('server rendering with string modes looks up no strategy', () => {
  const { wrap, preload } = setup(true)
  const html = renderToString(
    wrap(
      <>
        <Link to="/a" preload="intent">
          a
        </Link>
        <Link to="/b" preload="viewport">
          b
        </Link>
        <Link to="/c" preload="render">
          c
        </Link>
      </>,
    ),
  )
  expect(html).toContain('href="/c"')
  expect(stringStrategy).not.toHaveBeenCalled()
  expect(preload).not.toHaveBeenCalled()
})

test('disabled, external and reloadDocument Links start no strategy', () => {
  const { wrap, preload } = setup()
  const strategy = vi.fn()
  render(
    wrap(
      <>
        <Link to="/a" preload="render" disabled>
          a
        </Link>
        <Link to="https://example.com" preload="render">
          b
        </Link>
        <Link to="/c" preload="render" reloadDocument>
          c
        </Link>
        <Link to="/d" preload={strategy} disabled>
          d
        </Link>
      </>,
    ),
  )
  expect(stringStrategy).not.toHaveBeenCalled()
  expect(strategy).not.toHaveBeenCalled()
  expect(preload).not.toHaveBeenCalled()
})

test('an unknown string or an invalid value warns, preloads nothing and throws nothing', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const { wrap, preload } = setup()
  render(
    wrap(
      <>
        <Link to="/a" preload={'hover' as never}>
          a
        </Link>
        <Link to="/b" preload={'toString' as never}>
          b
        </Link>
        <Link to="/c" preload={true as never}>
          c
        </Link>
      </>,
    ),
  )
  for (const name of ['a', 'b', 'c']) {
    const link = screen.getByRole('link', { name })
    fireEvent.mouseEnter(link)
    fireEvent.focus(link)
    fireEvent.touchStart(link)
  }
  expect(preload).not.toHaveBeenCalled()
  expect(warn).toHaveBeenCalledTimes(3)
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('hover'))
})

test('hydrating a string-mode Link matches the server markup', async () => {
  const errors = vi.spyOn(console, 'error')
  const server = setup(true)
  const ui = (
    <Link to="/target" preload="intent" activeProps={{ className: 'active' }}>
      Target
    </Link>
  )
  const container = document.createElement('div')
  container.innerHTML = renderToString(server.wrap(ui))
  document.body.append(container)

  const client = setup()
  const { hydrateRoot } = await import('react-dom/client')
  const root = await act(() => hydrateRoot(container, client.wrap(ui)))
  expect(errors).not.toHaveBeenCalled()
  fireEvent.touchStart(screen.getByRole('link'))
  expect(client.preload).toHaveBeenCalledTimes(1)
  act(() => root.unmount())
  container.remove()
})
