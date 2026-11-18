import * as React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import { loadPreloadStrings } from '@tanstack/router-core'
import {
  Link,
  RouterContextProvider,
  batchedViewportPreload,
  createLink,
  createMemoryHistory,
  createRootRoute,
  createRouter,
  intentPreload,
  viewportPreload,
} from '../src'
import type { PreloadOption, RouterOptions } from '../src'

// String modes load their strategies on demand: load them up front, so
// events fired right after a render reach them.
beforeAll(async () => {
  await loadPreloadStrings()
})

// One callback per observed element
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
  cleanup()
})

const intersect = (element: Element, isIntersecting = true) => {
  act(() => {
    observed.get(element)!(
      [{ isIntersecting, target: element } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
  })
}

function setup(
  options: Partial<
    Pick<RouterOptions<any, any>, 'defaultPreload' | 'defaultPreloadDelay'>
  > = {},
) {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory(),
    isServer: false,
    ...options,
  })
  const preload = vi.spyOn(router, 'preloadRoute').mockResolvedValue(undefined)
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue()
  const mount = (ui: React.ReactNode) =>
    render(<RouterContextProvider router={router}>{ui}</RouterContextProvider>)
  return { router, preload, navigate, mount }
}

// Listener calls on `element`, by event type
const listenerCalls = (
  spy: { mock: { calls: Array<Array<unknown>>; contexts: Array<unknown> } },
  element: Element,
) =>
  spy.mock.calls
    .filter((_, i) => spy.mock.contexts[i] === element)
    .map(([type]) => type)

describe('invalid preload values are ignored', () => {
  test.each([
    ['true', true],
    ['an unknown string', 'hover'],
    ['a number', 1],
  ])('%s', (_, value) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { preload, mount } = setup()
    expect(() =>
      mount(
        <Link to="/target" preload={value as any} preloadDelay={0}>
          Target
        </Link>,
      ),
    ).not.toThrow()
    const link = screen.getByRole('link')
    fireEvent.mouseEnter(link)
    fireEvent.focus(link)
    fireEvent.touchStart(link)
    expect(preload).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('preload'))
  })
})
