import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import {
  Link,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '../src'

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

async function setup(options: { batch?: boolean } = {}) {
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <>
        {LINKS.map((id) => (
          <Link key={id} to="/$id" params={{ id }} preload="viewport">
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
    defaultPreloadViewportBatch: options.batch,
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

  return { preloads, scroll, view }
}

describe('defaultPreloadViewportBatch', () => {
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

  test('scrolling keeps restarting the delay', async () => {
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

  test('unmounting drops queued links and clears the timer', async () => {
    const { preloads, scroll, view } = await setup({ batch: true })

    scroll('a', true)
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(50)
    expect(preloads).toEqual([])
  })

  test('without the option, each link keeps its own timer', async () => {
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
