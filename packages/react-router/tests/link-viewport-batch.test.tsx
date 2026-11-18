import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  Link,
  RouterProvider,
  batchedViewportPreload,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  intentPreload,
  renderPreload,
  viewportPreload,
} from '../src'
import type { PreloadLink, PreloadOption, PreloadStrategy } from '../src'

// One callback per observed element, so tests can scroll links independently.
let observed: Map<Element, IntersectionObserverCallback>

beforeEach(() => {
  observed = new Map()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private cb: IntersectionObserverCallback) {}
      observe(el: Element) {
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
  options: { batch?: boolean; preload?: PreloadOption } = {},
) {
  // A link's own `preload` wins over the router's default
  const linkPreload = options.batch
    ? undefined
    : (options.preload ?? 'viewport')
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <>
        {LINKS.map((id) => (
          <Link key={id} to="/$id" params={{ id }} preload={linkPreload}>
            {id}
          </Link>
        ))}
      </>
    ),
  })
  const postRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/$id',
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, postRoute]),
    history: createMemoryHistory(),
    defaultPreloadDelay: 50,
    defaultPreload: options.batch ? batchedViewportPreload() : undefined,
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
  test.each([['intent'], [intentPreload]] as const)(
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
    },
  )

  test.each([['viewport'], [viewportPreload]] as const)(
    'viewport: %s',
    async (preload) => {
      const { preloads, scroll, links } = await setup({ preload })

      fireEvent.mouseEnter(links.b)
      scroll('a', true)
      await vi.advanceTimersByTimeAsync(50)
      expect(preloads.map(([id]) => id)).toEqual(['a'])
    },
  )

  test.each([['render'], [renderPreload]] as const)(
    'render: %s',
    async (preload) => {
      const { preloads } = await setup({ preload })
      expect(preloads.map(([id]) => id)).toEqual(['a', 'b', 'c'])
    },
  )

  test('a custom strategy decides on its own', async () => {
    // Hover or focus preloads at once, and leaving doesn't cancel anything
    const eager: PreloadStrategy = (link: PreloadLink) => ({
      enter: link.preload,
    })
    const { preloads, links } = await setup({ preload: eager })

    fireEvent.mouseEnter(links.a)
    fireEvent.mouseLeave(links.a)
    expect(preloads.map(([id]) => id)).toEqual(['a'])
    fireEvent.touchStart(links.b)
    expect(preloads.map(([id]) => id)).toEqual(['a'])
  })
})
