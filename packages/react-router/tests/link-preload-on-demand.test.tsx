import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { loadPreloadString, loadPreloadStrings } from '@tanstack/router-core'
import {
  Link,
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
  intentPreload,
} from '../src'
import type * as Core from '@tanstack/router-core'
import type { PreloadOption } from '../src'

// Each string mode loads its strategy's chunk on demand. These tests run in
// order: a chunk loads once per file, and the first tests run before any is
// loaded. A chunk can't load while a test runs synchronously.
vi.mock('@tanstack/router-core', async (importOriginal) => {
  const core = await importOriginal<typeof Core>()
  return { ...core, loadPreloadString: vi.fn(core.loadPreloadString) }
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
  vi.mocked(loadPreloadString).mockClear()
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

const loadChunk = async () => {
  await act(() => loadPreloadStrings())
}

test('server rendering with string modes neither runs loadPreloadString nor loads a chunk', () => {
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
  expect(loadPreloadString).not.toHaveBeenCalled()
  expect(preload).not.toHaveBeenCalled()
})

test('disabled, external and reloadDocument Links start no strategy and load nothing', () => {
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
  expect(loadPreloadString).not.toHaveBeenCalled()
  expect(strategy).not.toHaveBeenCalled()
  expect(preload).not.toHaveBeenCalled()
})

test('Links that mount while their chunks load follow option changes, and only mounted ones start', async () => {
  const add = vi.spyOn(Element.prototype, 'addEventListener')
  const { wrap, preload } = setup()
  const preloaded = () =>
    preload.mock.calls.map(([options]) => (options as { to: string }).to)

  type Options = {
    preload?: PreloadOption
    to?: string
    preloadDelay?: number
  }
  // Each Link's options can change while its chunk loads
  const setters: Record<string, (options: Options) => void> = {}
  function Changing({ id, initial }: { id: string; initial: Options }) {
    const [options, setOptions] = React.useState(initial)
    setters[id] = setOptions
    return (
      <Link to={`/${id}`} {...options}>
        {id}
      </Link>
    )
  }
  const unmounted = render(
    wrap(
      <Link to="/gone" preload="render">
        gone
      </Link>,
    ),
  )
  render(
    wrap(
      <>
        <React.StrictMode>
          <Link to="/strict" preload="intent" preloadDelay={0}>
            strict
          </Link>
        </React.StrictMode>
        <Changing id="toViewport" initial={{ preload: 'intent' }} />
        <Changing id="toFunction" initial={{ preload: 'render' }} />
        <Changing id="toFalse" initial={{ preload: 'render' }} />
        <Changing id="toChanged" initial={{ preload: 'render' }} />
        <Changing
          id="delayChanged"
          initial={{ preload: 'intent', preloadDelay: 0 }}
        />
      </>,
    ),
  )
  unmounted.unmount()

  // Interactions before the load: nothing preloads, nothing throws
  for (const name of ['strict', 'toViewport', 'delayChanged']) {
    const link = screen.getByRole('link', { name })
    fireEvent.mouseEnter(link)
    fireEvent.focus(link)
    fireEvent.touchStart(link)
  }
  act(() => {
    setters.toViewport!({ preload: 'viewport', preloadDelay: 0 })
    setters.toFunction!({ preload: intentPreload(), preloadDelay: 0 })
    setters.toFalse!({ preload: false })
    setters.toChanged!({ preload: 'render', to: '/changed' })
    setters.delayChanged!({ preload: 'intent', preloadDelay: 30 })
  })
  expect(preload).not.toHaveBeenCalled()

  await loadChunk()
  // Only the mounted 'render' Link with its latest destination
  expect(preloaded()).toEqual(['/changed'])

  // The StrictMode Link started once: one set of intent listeners
  const strict = screen.getByRole('link', { name: 'strict' })
  const listeners = add.mock.calls.filter(
    (_, i) => add.mock.contexts[i] === strict,
  )
  expect(listeners.map(([type]) => type)).toEqual([
    'mouseover',
    'focusin',
    'mouseleave',
    'focusout',
    'touchstart',
  ])
  fireEvent.mouseEnter(strict)
  expect(preloaded()).toEqual(['/changed', '/strict'])

  // intent -> viewport: the viewport strategy runs, hover doesn't preload
  const toViewport = screen.getByRole('link', { name: 'toViewport' })
  fireEvent.mouseEnter(toViewport)
  expect(preloaded()).toHaveLength(2)
  act(() => {
    observed.get(toViewport)!(
      [
        {
          isIntersecting: true,
          target: toViewport,
        } as unknown as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    )
  })
  expect(preloaded()).toEqual(['/changed', '/strict', '/toViewport'])

  // string -> function: the function runs, 'render' never did
  fireEvent.mouseEnter(screen.getByRole('link', { name: 'toFunction' }))
  expect(preloaded()).toEqual([
    '/changed',
    '/strict',
    '/toViewport',
    '/toFunction',
  ])

  // preloadDelay changed: the new delay counts
  vi.useFakeTimers()
  fireEvent.mouseEnter(screen.getByRole('link', { name: 'delayChanged' }))
  expect(preloaded()).toHaveLength(4)
  await vi.advanceTimersByTimeAsync(30)
  expect(preloaded()).toHaveLength(5)
  expect(preloaded()[4]).toBe('/delayChanged')

  // string -> false: nothing
  fireEvent.mouseEnter(screen.getByRole('link', { name: 'toFalse' }))
  expect(preloaded()).toHaveLength(5)
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
