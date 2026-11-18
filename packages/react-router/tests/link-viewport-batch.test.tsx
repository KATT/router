import * as React from 'react'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { loadPreloadStrings } from '@tanstack/router-core'
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

// String modes load their strategies on demand: load them up front, so
// events fired right after a render reach them.
beforeAll(async () => {
  await loadPreloadStrings()
})

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
    expect(batchedViewportPreload({ rootMargin: '1px', delay: 2 })).toBe(
      batchedViewportPreload({ delay: 2, rootMargin: '1px' }),
    )
    expect(intentPreload()).toBe(intentPreload())
    expect(renderPreload()).toBe(renderPreload())
    expect(intentPreload({ delay: 1 })).toBe(intentPreload({ delay: 1 }))
    expect(viewportPreload({ rootMargin: '1px', delay: 2 })).toBe(
      viewportPreload({ delay: 2, rootMargin: '1px' }),
    )
    expect(intentPreload({ delay: 1 })).not.toBe(intentPreload({ delay: 2 }))
  })

  test('an inline intentPreload({ delay }) keeps a pending preload across re-renders', async () => {
    const { preloads, links } = await setup({
      inlinePreload: () => intentPreload({ delay: 30 }),
    })
    fireEvent.mouseEnter(links.a)
    await vi.advanceTimersByTimeAsync(20)
    // A re-render calls intentPreload({ delay: 30 }) again: same strategy, so
    // the Link doesn't restart it and the timer keeps running
    fireEvent.click(screen.getByRole('button', { name: 'rerender' }))
    await vi.advanceTimersByTimeAsync(10)
    expect(preloads.map(([id]) => id)).toEqual(['a'])
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
      return (link) => {
        link.element?.addEventListener('mouseenter', link.preload)
      }
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

  test('a custom strategy listens to the events it chooses and cleans up', async () => {
    // Pointer enter preloads at once; nothing else does
    const cleanups: Array<Element | null> = []
    const eager = createPreloadStrategy(() => (link: PreloadLink) => {
      const { element, preload } = link
      element?.addEventListener('pointerenter', preload)
      return () => {
        element?.removeEventListener('pointerenter', preload)
        cleanups.push(element)
      }
    })
    const { preloads, links, view } = await setup({ preload: eager() })

    fireEvent.mouseEnter(links.a)
    fireEvent.focus(links.a)
    fireEvent.touchStart(links.a)
    expect(preloads).toEqual([])
    fireEvent.pointerEnter(links.b)
    expect(preloads.map(([id]) => id)).toEqual(['b'])

    // Unmounting runs each link's cleanup, which stops listening
    view.unmount()
    expect(cleanups).toEqual([links.a, links.b, links.c])
    fireEvent.pointerEnter(links.c)
    expect(preloads.map(([id]) => id)).toEqual(['b'])
  })
})

describe('strategies attach only the listeners they need', () => {
  const linkListeners = async (preload: PreloadOption | 'batch') => {
    const add = vi.spyOn(Element.prototype, 'addEventListener')
    const remove = vi.spyOn(Element.prototype, 'removeEventListener')
    const { links, view } = await setup(
      preload === 'batch' ? { batch: true } : { preload },
    )
    const onLinks = (spy: typeof add) =>
      spy.mock.calls
        .filter((_, i) =>
          Object.values(links).includes(spy.mock.contexts[i] as HTMLElement),
        )
        .map(([type]) => type)
    const added = onLinks(add)
    view.unmount()
    const removed = onLinks(remove)
    add.mockRestore()
    remove.mockRestore()
    return { added, removed }
  }

  // A click the Link navigates on reaches the strategy through the Link
  test.each([
    ['viewportPreload()', viewportPreload()],
    ['batchedViewportPreload()', 'batch'],
  ] as const)('%s: none, an observer watches the link', async (_, preload) => {
    const { added, removed } = await linkListeners(preload)
    expect(added).toEqual([])
    expect(removed).toEqual([])
  })

  test('intentPreload(): hover, focus and touch', async () => {
    const { added, removed } = await linkListeners(intentPreload())
    const perLink = [
      'mouseover',
      'focusin',
      'mouseleave',
      'focusout',
      'touchstart',
    ]
    expect(added).toEqual([...perLink, ...perLink, ...perLink])
    expect(removed).toEqual(added)
  })

  test('renderPreload(): none', async () => {
    const { added, removed } = await linkListeners(renderPreload())
    expect(added).toEqual([])
    expect(removed).toEqual([])
  })
})
