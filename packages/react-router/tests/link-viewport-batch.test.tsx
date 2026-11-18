import * as React from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  Link,
  RouterProvider,
  batchedViewportPreload,
  createMemoryHistory,
  createPreloadStrategy,
  createRootRoute,
  createRoute,
  createRouter,
  intentPreload,
  renderPreload,
  viewportPreload,
} from '../src'
import type {
  BatchedViewportPreloadOptions,
  PreloadLink,
  PreloadOption,
} from '../src'

// One callback per observed element, so tests can scroll links independently.
let observed: Map<Element, IntersectionObserverCallback>
let rootMargins: Array<string | undefined>
let observeCalls: number

beforeEach(() => {
  observed = new Map()
  rootMargins = []
  observeCalls = 0
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(
        private cb: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        rootMargins.push(options?.rootMargin)
      }
      observe(el: Element) {
        observeCalls++
        observed.set(el, this.cb)
      }
      disconnect() {
        observed.forEach((cb, el) => {
          if (cb === this.cb) {
            observed.delete(el)
          }
        })
      }
      unobserve() {}
      takeRecords() {
        return []
      }
    },
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  cleanup()
})

const LINKS = ['a', 'b', 'c'] as const

async function setup(
  options: {
    batch?: boolean | BatchedViewportPreloadOptions
    preload?: PreloadOption
    // Called on every render of every link, as an inline prop would be
    inlinePreload?: () => PreloadOption
    linkDelay?: number
  } = {},
) {
  // A link's own `preload` wins over the router's default
  const linkPreload = options.batch
    ? undefined
    : (options.preload ?? 'viewport')
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: function Index() {
      const [, rerender] = React.useState(0)
      return (
        <>
          <button onClick={() => rerender((n) => n + 1)}>rerender</button>
          {LINKS.map((id) => (
            <Link
              key={id}
              to="/$id"
              params={{ id }}
              preload={options.inlinePreload?.() ?? linkPreload}
              preloadDelay={options.linkDelay}
            >
              {id}
            </Link>
          ))}
        </>
      )
    },
  })
  const postRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/$id',
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, postRoute]),
    history: createMemoryHistory(),
    defaultPreloadDelay: 50,
    defaultPreload: options.batch
      ? batchedViewportPreload(
          options.batch === true ? undefined : options.batch,
        )
      : undefined,
  })

  // The time each link's preload started, in link order.
  const preloads: Array<[string, number]> = []
  vi.spyOn(router, 'preloadRoute').mockImplementation((opts: any) => {
    preloads.push([opts.params.id, Date.now()])
    return Promise.resolve(undefined)
  })

  const view = render(<RouterProvider router={router} />)
  const links = Object.fromEntries(
    await Promise.all(
      LINKS.map(async (id) => [
        id,
        await screen.findByRole('link', { name: id }),
      ]),
    ),
  ) as Record<(typeof LINKS)[number], HTMLElement>
  vi.useFakeTimers()

  const scroll = (id: (typeof LINKS)[number], isIntersecting: boolean) => {
    act(() => {
      observed.get(links[id])!(
        [
          {
            isIntersecting,
            target: links[id],
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      )
    })
  }

  return { preloads, scroll, view, links }
}

describe('batchedViewportPreload()', () => {
  test('links in view preload together, once the delay passes after the last change', async () => {
    const { preloads, scroll } = await setup({ batch: true })

    scroll('a', true)
    await vi.advanceTimersByTimeAsync(30)
    scroll('b', true)
    await vi.advanceTimersByTimeAsync(30)
    scroll('c', true)
    await vi.advanceTimersByTimeAsync(49)
    expect(preloads).toEqual([])

    await vi.advanceTimersByTimeAsync(1)
    expect(preloads.map(([id]) => id)).toEqual(['a', 'b', 'c'])
    // One flush: every preload started at the same moment.
    expect(new Set(preloads.map(([, at]) => at)).size).toBe(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  test('a link that leaves before the flush is not preloaded', async () => {
    const { preloads, scroll } = await setup({ batch: true })

    scroll('a', true)
    scroll('b', true)
    await vi.advanceTimersByTimeAsync(20)
    scroll('a', false)
    await vi.advanceTimersByTimeAsync(50)

    expect(preloads.map(([id]) => id)).toEqual(['b'])
  })

  test('intersection changes keep restarting the delay', async () => {
    const { preloads, scroll } = await setup({ batch: true })

    scroll('a', true)
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(40)
      scroll('c', i % 2 === 0)
    }
    expect(preloads).toEqual([])

    await vi.advanceTimersByTimeAsync(50)
    expect(preloads.map(([id]) => id)).toEqual(['a', 'c'])
  })

  test('scrolling or resizing keeps the batch waiting until the page settles', async () => {
    const { preloads, scroll } = await setup({ batch: true })

    scroll('a', true)
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(40)
      document.dispatchEvent(new Event('scroll'))
    }
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(40)
      window.dispatchEvent(new Event('resize'))
    }
    expect(preloads).toEqual([])

    await vi.advanceTimersByTimeAsync(50)
    expect(preloads.map(([id]) => id)).toEqual(['a'])
  })

  test('unmounting drops queued links and clears the timer', async () => {
    const { preloads, scroll, view } = await setup({ batch: true })

    scroll('a', true)
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(50)
    expect(preloads).toEqual([])
  })

  test("preload='viewport' keeps one timer per link", async () => {
    const { preloads, scroll } = await setup()

    scroll('a', true)
    await vi.advanceTimersByTimeAsync(30)
    scroll('b', true)
    await vi.advanceTimersByTimeAsync(20)
    expect(preloads.map(([id]) => id)).toEqual(['a'])

    await vi.advanceTimersByTimeAsync(30)
    expect(preloads.map(([id]) => id)).toEqual(['a', 'b'])
    expect(preloads[1]![1] - preloads[0]![1]).toBe(30)
  })
})

describe('strategies by import work like their strings', () => {
  test.each([['intent'], [intentPreload()]] as const)(
    'intent: %s',
    async (preload) => {
      const { preloads, links } = await setup({ preload })

      fireEvent.mouseEnter(links.a)
      fireEvent.mouseLeave(links.a)
      fireEvent.focus(links.b)
      await vi.advanceTimersByTimeAsync(49)
      expect(preloads).toEqual([])
      await vi.advanceTimersByTimeAsync(1)
      expect(preloads.map(([id]) => id)).toEqual(['b'])

      fireEvent.touchStart(links.c)
      expect(preloads.map(([id]) => id)).toEqual(['b', 'c'])

      // A click cancels a pending hover preload before it navigates
      fireEvent.mouseEnter(links.a)
      fireEvent.click(links.a)
      await vi.advanceTimersByTimeAsync(50)
      expect(preloads.map(([id]) => id)).toEqual(['b', 'c'])
    },
  )

  test.each([['viewport'], [viewportPreload()]] as const)(
    'viewport: %s',
    async (preload) => {
      const { preloads, scroll, links } = await setup({ preload })

      fireEvent.mouseEnter(links.b)
      fireEvent.touchStart(links.b)
      scroll('a', true)
      scroll('c', true)
      await vi.advanceTimersByTimeAsync(20)
      // Leaving before the delay cancels
      scroll('c', false)
      await vi.advanceTimersByTimeAsync(30)
      expect(preloads.map(([id]) => id)).toEqual(['a'])
      expect(rootMargins).toEqual(['100px', '100px', '100px'])
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  test.each([['render'], [renderPreload()]] as const)(
    'render: %s',
    async (preload) => {
      const { preloads, links } = await setup({ preload })
      expect(preloads.map(([id]) => id)).toEqual(['a', 'b', 'c'])

      // Once per link: re-rendering, hovering or touching adds nothing
      fireEvent.click(screen.getByRole('button', { name: 'rerender' }))
      fireEvent.mouseEnter(links.a)
      fireEvent.touchStart(links.a)
      await vi.advanceTimersByTimeAsync(50)
      expect(preloads.map(([id]) => id)).toEqual(['a', 'b', 'c'])
    },
  )

  test('same options give the same strategy', () => {
    expect(batchedViewportPreload()).toBe(batchedViewportPreload())
    expect(intentPreload({ delay: 1 })).toBe(intentPreload({ delay: 1 }))
    expect(viewportPreload({ rootMargin: '1px', delay: 2 })).toBe(
      viewportPreload({ delay: 2, rootMargin: '1px' }),
    )
    expect(intentPreload({ delay: 1 })).not.toBe(intentPreload({ delay: 2 }))
  })

  test('an inline batchedViewportPreload() on each link shares one batch', async () => {
    const { preloads, scroll } = await setup({
      inlinePreload: () => batchedViewportPreload({ delay: 30 }),
    })
    // One observer for all three links
    expect(rootMargins).toEqual(['100px'])

    scroll('a', true)
    await vi.advanceTimersByTimeAsync(20)
    scroll('b', true)
    // Re-rendering calls the inline factory again: same strategy, no restart
    const observed = observeCalls
    fireEvent.click(screen.getByRole('button', { name: 'rerender' }))
    expect(observeCalls).toBe(observed)
    await vi.advanceTimersByTimeAsync(29)
    expect(preloads).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(preloads.map(([id]) => id)).toEqual(['a', 'b'])
    expect(rootMargins).toEqual(['100px'])
  })

  test("a link's preloadDelay wins over a strategy's delay, which wins over the router's", async () => {
    // The router's defaultPreloadDelay is 50 in these tests
    const { preloads, links } = await setup({
      preload: intentPreload({ delay: 200 }),
    })
    fireEvent.mouseEnter(links.a)
    await vi.advanceTimersByTimeAsync(199)
    expect(preloads).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(preloads.map(([id]) => id)).toEqual(['a'])

    cleanup()
    vi.useRealTimers()
    const second = await setup({
      preload: intentPreload({ delay: 200 }),
      linkDelay: 5,
    })
    fireEvent.mouseEnter(second.links.a)
    await vi.advanceTimersByTimeAsync(5)
    expect(second.preloads.map(([id]) => id)).toEqual(['a'])
  })

  test('viewport strategies take a rootMargin', async () => {
    await setup({ preload: viewportPreload({ rootMargin: '300px' }) })
    expect(rootMargins).toEqual(['300px', '300px', '300px'])
    cleanup()
    vi.useRealTimers()
    rootMargins = []
    const { preloads, scroll } = await setup({
      batch: { rootMargin: '50px', delay: 10 },
    })
    expect(rootMargins).toEqual(['50px'])

    // The batch's own delay (10) wins over defaultPreloadDelay (50)
    scroll('a', true)
    await vi.advanceTimersByTimeAsync(10)
    expect(preloads.map(([id]) => id)).toEqual(['a'])
  })

  test('createPreloadStrategy starts a strategy once per router', async () => {
    const started: Array<unknown> = []
    const eager = createPreloadStrategy<{ id?: string }>((_options, router) => {
      started.push(router)
      return (link) => ({ enter: link.preload })
    })
    const { preloads, links } = await setup({
      inlinePreload: () => eager({ id: 'x' }),
    })
    expect(started).toHaveLength(1)
    fireEvent.mouseEnter(links.a)
    expect(preloads.map(([id]) => id)).toEqual(['a'])

    cleanup()
    vi.useRealTimers()
    // A new router starts it again
    await setup({ preload: eager({ id: 'x' }) })
    expect(started).toHaveLength(2)
    expect(started[0]).not.toBe(started[1])
  })

  test('a custom strategy decides on its own', async () => {
    // Hover or focus preloads at once, and leaving doesn't cancel anything
    const cleanups: Array<Element | null> = []
    const eager = createPreloadStrategy(() => (link: PreloadLink) => ({
      enter: link.preload,
      cleanup: () => cleanups.push(link.element),
    }))
    const { preloads, links, view } = await setup({ preload: eager() })

    fireEvent.mouseEnter(links.a)
    fireEvent.mouseLeave(links.a)
    expect(preloads.map(([id]) => id)).toEqual(['a'])
    fireEvent.touchStart(links.b)
    expect(preloads.map(([id]) => id)).toEqual(['a'])
    fireEvent.focus(links.c)
    expect(preloads.map(([id]) => id)).toEqual(['a', 'c'])

    // Unmounting cleans up and stops listening
    view.unmount()
    expect(cleanups).toEqual([links.a, links.b, links.c])
    fireEvent.mouseEnter(links.a)
    expect(preloads.map(([id]) => id)).toEqual(['a', 'c'])
  })
})
