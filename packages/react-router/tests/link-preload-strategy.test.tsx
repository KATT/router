import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  Link,
  RouterContextProvider,
  batchedViewportPreload,
  createLink,
  createMemoryHistory,
  createRootRoute,
  createRouter,
  intentPreload,
  renderPreload,
  viewportPreload,
} from '../src'
import type { PreloadOption, RouterOptions } from '../src'

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

describe('intent', () => {
  test.each([['intent'], [intentPreload()]] as const)(
    'moving between children of a link starts one preload (%s)',
    (preloadOption) => {
      const { preload, mount } = setup()
      mount(
        <Link to="/target" preload={preloadOption} preloadDelay={0}>
          <span>a</span>
          <span>b</span>
        </Link>,
      )
      const link = screen.getByRole('link')
      const [a, b] = link.querySelectorAll('span')

      fireEvent.mouseOver(link)
      fireEvent.mouseOver(b!, { relatedTarget: a })
      fireEvent.mouseOver(a!, { relatedTarget: b })
      expect(preload).toHaveBeenCalledTimes(1)

      // Leaving and entering again is a new enter
      fireEvent.mouseLeave(link)
      fireEvent.mouseOver(a!, { relatedTarget: document.body })
      expect(preload).toHaveBeenCalledTimes(2)
    },
  )

  test('a link focused before its strategy starts (autoFocus) preloads', () => {
    const { preload, mount } = setup()
    // React focuses an `autoFocus` button as it mounts
    const ButtonLink = createLink(
      React.forwardRef<HTMLButtonElement, any>(function Button(props, ref) {
        return <button ref={ref} {...props} />
      }),
    )
    mount(
      <ButtonLink to="/target" preload="intent" preloadDelay={0} autoFocus>
        Target
      </ButtonLink>,
    )
    expect(document.activeElement).toBe(screen.getByRole('button'))
    expect(preload).toHaveBeenCalledTimes(1)
  })

  test('a link focused by a parent layout effect waits the delay, then preloads', async () => {
    const { preload, mount } = setup()
    function App() {
      const ref = React.useRef<HTMLAnchorElement>(null)
      React.useLayoutEffect(() => {
        ref.current!.focus()
      }, [])
      return (
        <Link ref={ref} to="/target" preload="intent" preloadDelay={20}>
          Target
        </Link>
      )
    }
    vi.useFakeTimers()
    mount(<App />)
    await vi.advanceTimersByTimeAsync(19)
    expect(preload).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(preload).toHaveBeenCalledTimes(1)
  })
})

describe('a click cancels a pending preload only when the Link navigates on it', () => {
  type Strategy = 'intent' | 'viewport' | 'batched'
  const strategies: Array<Strategy> = ['intent', 'viewport', 'batched']

  // Starts a pending preload of the link (delay 50), then clicks it
  async function clickWhilePending(
    strategy: Strategy,
    props: Record<string, unknown>,
    click: Parameters<typeof fireEvent.click>[1] = {},
  ) {
    const { preload, navigate, mount } = setup({
      defaultPreloadDelay: 50,
      defaultPreload: strategy === 'batched' ? batchedViewportPreload() : false,
    })
    mount(
      <Link
        to="/target"
        preload={strategy === 'batched' ? undefined : strategy}
        {...props}
      >
        Target
      </Link>,
    )
    const link = screen.getByRole('link')
    vi.useFakeTimers()
    // jsdom can't follow a click the Link leaves to the browser
    window.addEventListener('click', (e) => e.preventDefault(), { once: true })
    if (strategy === 'intent') {
      fireEvent.mouseEnter(link)
    } else {
      intersect(link)
    }
    fireEvent.click(link, click)
    await vi.advanceTimersByTimeAsync(50)
    return { preload, navigate }
  }

  test.each(strategies)('%s: a plain click cancels it', async (strategy) => {
    const { preload, navigate } = await clickWhilePending(strategy, {})
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(preload).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  test.each(
    strategies.flatMap((strategy) =>
      (
        [
          ['ctrl', {}, { ctrlKey: true }],
          ['meta', {}, { metaKey: true }],
          ['shift', {}, { shiftKey: true }],
          ['alt', {}, { altKey: true }],
          ['middle button', {}, { button: 1 }],
          ['target="_blank"', { target: '_blank' }, {}],
          [
            'onClick calling preventDefault()',
            { onClick: (e: React.MouseEvent) => e.preventDefault() },
            {},
          ],
        ] as const
      ).map(([name, props, click]) => [strategy, name, props, click] as const),
    ),
  )('%s: a %s click keeps it', async (strategy, _name, props, click) => {
    const { preload, navigate } = await clickWhilePending(
      strategy,
      props,
      click,
    )
    expect(navigate).not.toHaveBeenCalled()
    expect(preload).toHaveBeenCalledTimes(1)
  })
})

describe('re-renders that keep the destination keep the strategy running', () => {
  function App({ preload }: { preload: PreloadOption }) {
    const [, rerender] = React.useState(0)
    return (
      <>
        <button onClick={() => rerender((n) => n + 1)}>rerender</button>
        {/* Inline functions and objects: new on every render */}
        <Link
          to="/target"
          search={(prev: any) => prev}
          state={{ from: 'here' } as any}
          preload={preload}
        >
          Target
        </Link>
      </>
    )
  }

  test('an inline search function does not restart the strategy', () => {
    const stop = vi.fn()
    const strategy = vi.fn(() => stop)
    const { mount } = setup()
    mount(<App preload={strategy} />)
    expect(strategy).toHaveBeenCalledTimes(1)

    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'rerender' }))
    }
    expect(strategy).toHaveBeenCalledTimes(1)
    expect(stop).not.toHaveBeenCalled()
  })

  test('a pending intent preload survives a no-op re-render', async () => {
    const { preload, mount } = setup({ defaultPreloadDelay: 50 })
    mount(<App preload="intent" />)
    vi.useFakeTimers()
    fireEvent.mouseEnter(screen.getByRole('link'))
    await vi.advanceTimersByTimeAsync(30)
    fireEvent.click(screen.getByRole('button', { name: 'rerender' }))
    await vi.advanceTimersByTimeAsync(20)
    expect(preload).toHaveBeenCalledTimes(1)
    // The latest options are the ones preloaded
    expect(preload).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/target' }),
    )
  })

  test('a no-op re-render does not restart the batch timer', async () => {
    const { preload, mount } = setup({ defaultPreloadDelay: 50 })
    mount(<App preload={batchedViewportPreload()} />)
    vi.useFakeTimers()
    intersect(screen.getByRole('link'))
    await vi.advanceTimersByTimeAsync(30)
    fireEvent.click(screen.getByRole('button', { name: 'rerender' }))
    await vi.advanceTimersByTimeAsync(20)
    expect(preload).toHaveBeenCalledTimes(1)
  })
})

describe('a link component that changes its element', () => {
  let swap: () => void
  const SwapLink = createLink(
    React.forwardRef<any, any>(function Swap(props, ref) {
      const [state, setState] = React.useState<'none' | 'a' | 'button'>(
        props.initial ?? 'a',
      )
      swap = () => setState((s) => (s === 'a' ? 'button' : 'a'))
      const { initial: _, ...rest } = props
      if (state === 'none') {
        return null
      }
      return state === 'a' ? (
        <a ref={ref} {...rest} />
      ) : (
        <button ref={ref} {...rest} />
      )
    }),
  )

  test.each([false, true])(
    'the strategy follows a switch between <a> and <button> (forwarded ref: %s)',
    (withRef) => {
      const { preload, mount } = setup()
      const userRef = React.createRef<HTMLElement>()
      mount(
        <SwapLink
          to="/target"
          preload="intent"
          preloadDelay={0}
          ref={withRef ? userRef : undefined}
        >
          Target
        </SwapLink>,
      )
      act(() => swap())
      const button = screen.getByRole('button', { name: 'Target' })
      if (withRef) {
        expect(userRef.current).toBe(button)
      }
      fireEvent.mouseEnter(button)
      expect(preload).toHaveBeenCalledTimes(1)

      act(() => swap())
      fireEvent.mouseEnter(screen.getByRole('link', { name: 'Target' }))
      expect(preload).toHaveBeenCalledTimes(2)
    },
  )

  test('an element that renders after the Link mounts starts the strategy', () => {
    const { preload, mount } = setup()
    let show!: () => void
    const LateLink = createLink(
      React.forwardRef<any, any>(function Late(props, ref) {
        const [shown, setShown] = React.useState(false)
        show = () => setShown(true)
        return shown ? <a ref={ref} {...props} /> : null
      }),
    )
    mount(
      <LateLink to="/target" preload="intent" preloadDelay={0}>
        Target
      </LateLink>,
    )
    act(() => show())
    fireEvent.mouseEnter(screen.getByRole('link'))
    expect(preload).toHaveBeenCalledTimes(1)
  })
})

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

describe('batchedViewportPreload()', () => {
  test("a link's own preloadDelay doesn't change the batch's delay", async () => {
    const { preload, mount } = setup({
      defaultPreloadDelay: 50,
      defaultPreload: batchedViewportPreload(),
    })
    mount(
      <Link to="/target" preloadDelay={5}>
        Target
      </Link>,
    )
    vi.useFakeTimers()
    intersect(screen.getByRole('link'))
    await vi.advanceTimersByTimeAsync(49)
    expect(preload).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(preload).toHaveBeenCalledTimes(1)
  })

  test('a click on the only queued link leaves no timer', async () => {
    const { preload, navigate, mount } = setup({
      defaultPreloadDelay: 50,
      defaultPreload: batchedViewportPreload(),
    })
    mount(<Link to="/target">Target</Link>)
    vi.useFakeTimers()
    const link = screen.getByRole('link')
    intersect(link)
    fireEvent.click(link)
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(50)
    expect(preload).not.toHaveBeenCalled()
  })

  describe('the batch listens to the page only while it has links', () => {
    const pageListeners = () => {
      const spies = [
        vi.spyOn(document, 'addEventListener'),
        vi.spyOn(document, 'removeEventListener'),
        vi.spyOn(window, 'addEventListener'),
        vi.spyOn(window, 'removeEventListener'),
      ]
      const count = (i: number) =>
        spies[i]!.mock.calls.filter(([type]) =>
          ['scroll', 'resize'].includes(type),
        ).length
      // Listeners added and not removed yet
      return () => count(0) + count(2) - count(1) - count(3)
    }

    test('unmounting every link removes them; the next link adds them again', () => {
      const listening = pageListeners()
      const disconnect = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
      const { mount } = setup({ defaultPreload: batchedViewportPreload() })
      const links = (
        <>
          <Link to="/a">a</Link>
          <Link to="/b">b</Link>
        </>
      )
      const first = mount(links)
      expect(listening()).toBe(2)
      first.unmount()
      expect(listening()).toBe(0)
      expect(disconnect).toHaveBeenCalledTimes(1)

      const second = mount(links)
      expect(listening()).toBe(2)
      expect(observed.size).toBe(2)
      second.unmount()
      expect(listening()).toBe(0)
    })

    test('stays bounded across many routers and options', () => {
      const listening = pageListeners()
      for (let i = 0; i < 20; i++) {
        const { mount } = setup()
        mount(
          <Link to="/a" preload={batchedViewportPreload({ delay: i })}>
            a
          </Link>,
        ).unmount()
      }
      expect(listening()).toBe(0)
      expect(observed.size).toBe(0)
    })
  })
})

describe('delays', () => {
  // [router default, strategy delay, link preloadDelay, expected wait]
  const cases = [
    [50, undefined, undefined, 50],
    [50, 30, undefined, 30],
    [50, 30, 10, 10],
    // `??`, not `||`: an explicit 0 wins
    [50, 30, 0, 0],
    [50, 0, undefined, 0],
    [0, undefined, undefined, 0],
  ] as const
  test.each(
    (['intent', 'viewport'] as const).flatMap((strategy) =>
      cases.map((c) => [strategy, ...c] as const),
    ),
  )(
    '%s: router %s, strategy %s, link %s waits %s',
    async (strategy, routerDelay, strategyDelay, linkDelay, wait) => {
      const { preload, mount } = setup({ defaultPreloadDelay: routerDelay })
      const preloadOption =
        strategy === 'intent'
          ? intentPreload({ delay: strategyDelay })
          : viewportPreload({ delay: strategyDelay })
      mount(
        <Link to="/target" preload={preloadOption} preloadDelay={linkDelay}>
          Target
        </Link>,
      )
      const link = screen.getByRole('link')
      vi.useFakeTimers()
      if (strategy === 'intent') {
        fireEvent.mouseEnter(link)
      } else {
        intersect(link)
      }
      if (wait) {
        await vi.advanceTimersByTimeAsync(wait - 1)
        expect(preload).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(1)
      }
      expect(preload).toHaveBeenCalledTimes(1)
    },
  )
})

describe('intent timer', () => {
  const mountIntent = () => {
    const { preload, mount } = setup({ defaultPreloadDelay: 50 })
    mount(
      <Link to="/target" preload="intent">
        Target
      </Link>,
    )
    vi.useFakeTimers()
    return { preload, link: screen.getByRole('link') }
  }

  test('hover then focus starts one timer', async () => {
    const { preload, link } = mountIntent()
    fireEvent.mouseEnter(link)
    await vi.advanceTimersByTimeAsync(20)
    fireEvent.focus(link)
    await vi.advanceTimersByTimeAsync(29)
    expect(preload).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(preload).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(50)
    expect(preload).toHaveBeenCalledTimes(1)
  })

  test('focus then blur cancels', async () => {
    const { preload, link } = mountIntent()
    fireEvent.focus(link)
    await vi.advanceTimersByTimeAsync(20)
    fireEvent.blur(link)
    await vi.advanceTimersByTimeAsync(50)
    expect(preload).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  test('keyboard focus (element.focus()) preloads', async () => {
    const { preload, link } = mountIntent()
    act(() => link.focus())
    await vi.advanceTimersByTimeAsync(50)
    expect(preload).toHaveBeenCalledTimes(1)
  })

  test.each([['intent'], [intentPreload()]] as const)(
    "preventDefault() in the Link's own handlers stops it (%s)",
    (preloadOption) => {
      const { preload, mount } = setup()
      const handlers = {
        onMouseEnter: vi.fn((e: React.SyntheticEvent) => e.preventDefault()),
        onFocus: vi.fn((e: React.SyntheticEvent) => e.preventDefault()),
        onTouchStart: vi.fn((e: React.SyntheticEvent) => e.preventDefault()),
      }
      mount(
        <Link
          to="/target"
          preload={preloadOption}
          preloadDelay={0}
          {...handlers}
        >
          Target
        </Link>,
      )
      const link = screen.getByRole('link')
      fireEvent.mouseEnter(link)
      fireEvent.focus(link)
      fireEvent.touchStart(link)
      expect(handlers.onMouseEnter).toHaveBeenCalledTimes(1)
      expect(handlers.onFocus).toHaveBeenCalledTimes(1)
      expect(handlers.onTouchStart).toHaveBeenCalledTimes(1)
      expect(preload).not.toHaveBeenCalled()
    },
  )

  test('intentPreload({ delay }) waits its delay; a link preloadDelay wins', async () => {
    const { preload, mount } = setup({ defaultPreloadDelay: 50 })
    mount(
      <>
        <Link to="/a" preload={intentPreload({ delay: 20 })}>
          a
        </Link>
        <Link to="/b" preload={intentPreload({ delay: 20 })} preloadDelay={40}>
          b
        </Link>
      </>,
    )
    vi.useFakeTimers()
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'a' }))
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'b' }))
    await vi.advanceTimersByTimeAsync(19)
    expect(preload).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(preload).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ to: '/a' }),
    )
    await vi.advanceTimersByTimeAsync(20)
    expect(preload).toHaveBeenCalledTimes(2)
    expect(preload).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: '/b' }),
    )
  })

  test('unmounting cancels it', async () => {
    const { preload, mount } = setup({ defaultPreloadDelay: 50 })
    const view = mount(
      <Link to="/target" preload="intent">
        Target
      </Link>,
    )
    vi.useFakeTimers()
    fireEvent.mouseEnter(screen.getByRole('link'))
    view.unmount()
    await vi.advanceTimersByTimeAsync(50)
    expect(preload).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('viewport', () => {
  test('without IntersectionObserver: no error, no listeners, no preload; intent still works', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const add = [
      vi.spyOn(Element.prototype, 'addEventListener'),
      vi.spyOn(document, 'addEventListener'),
      vi.spyOn(window, 'addEventListener'),
    ]
    const { preload, mount } = setup({ defaultPreloadDelay: 0 })
    mount(
      <>
        <Link to="/a" preload="viewport">
          a
        </Link>
        <Link to="/b" preload={batchedViewportPreload()}>
          b
        </Link>
        <Link to="/c" preload="intent">
          c
        </Link>
      </>,
    )
    const [a, b, c] = screen.getAllByRole('link')
    for (const element of [a, b]) {
      expect(listenerCalls(add[0]!, element!)).toEqual([])
    }
    const pageTypes = [...add[1]!.mock.calls, ...add[2]!.mock.calls].map(
      ([type]) => type,
    )
    expect(pageTypes).not.toContain('scroll')
    expect(pageTypes).not.toContain('resize')
    fireEvent.mouseEnter(a!)
    fireEvent.mouseEnter(b!)
    expect(preload).not.toHaveBeenCalled()
    fireEvent.mouseEnter(c!)
    expect(preload).toHaveBeenCalledTimes(1)
  })

  test('unmounting with a pending preload disconnects and leaves no timer', async () => {
    const disconnect = vi.spyOn(IntersectionObserver.prototype, 'disconnect')
    const { preload, mount } = setup({ defaultPreloadDelay: 50 })
    const view = mount(
      <Link to="/target" preload="viewport">
        Target
      </Link>,
    )
    vi.useFakeTimers()
    intersect(screen.getByRole('link'))
    expect(vi.getTimerCount()).toBe(1)
    view.unmount()
    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(50)
    expect(preload).not.toHaveBeenCalled()
  })
})

describe('render', () => {
  test('preloads once per Link across option changes, and again for a new Link', () => {
    const { preload, mount } = setup()
    let update!: (next: { to?: string; preload?: PreloadOption }) => void
    let remount!: () => void
    function App() {
      const [options, setOptions] = React.useState<{
        to: string
        preload: PreloadOption
      }>({ to: '/a', preload: 'render' })
      const [key, setKey] = React.useState(0)
      update = (next) => setOptions((prev) => ({ ...prev, ...next }))
      remount = () => setKey((k) => k + 1)
      return (
        <Link key={key} to={options.to} preload={options.preload}>
          Target
        </Link>
      )
    }
    mount(<App />)
    expect(preload).toHaveBeenCalledTimes(1)
    act(() => update({ to: '/b' }))
    act(() => update({ preload: false }))
    act(() => update({ preload: 'render' }))
    act(() => update({ preload: renderPreload() }))
    expect(preload).toHaveBeenCalledTimes(1)
    act(() => remount())
    expect(preload).toHaveBeenCalledTimes(2)
    expect(preload).toHaveBeenLastCalledWith(
      expect.objectContaining({ to: '/b' }),
    )
  })
})

describe('createLink', () => {
  test('a component that drops the ref gets no strategy, and nothing throws; intent works through its props', () => {
    const { preload, mount } = setup()
    const NoRefLink = createLink(function NoRef(props: any) {
      const { ref: _ref, ...rest } = props
      return <a {...rest} />
    })
    const strategy = vi.fn()
    mount(
      <>
        <NoRefLink to="/a" preload={strategy}>
          a
        </NoRefLink>
        <NoRefLink to="/b" preload="intent" preloadDelay={0}>
          b
        </NoRefLink>
      </>,
    )
    expect(strategy).not.toHaveBeenCalled()
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'a' }))
    expect(preload).not.toHaveBeenCalled()
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'b' }))
    expect(preload).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ to: '/b' }),
    )
  })

  test('a component that forwards the ref preloads', () => {
    const { preload, mount } = setup()
    const RefLink = createLink(
      React.forwardRef<HTMLAnchorElement, any>(function WithRef(props, ref) {
        return <a ref={ref} {...props} />
      }),
    )
    mount(
      <RefLink to="/target" preload="intent" preloadDelay={0}>
        Target
      </RefLink>,
    )
    fireEvent.mouseEnter(screen.getByRole('link'))
    expect(preload).toHaveBeenCalledTimes(1)
  })
})

describe('batchedViewportPreload() batches', () => {
  // Links `ids` on `router`, with a setter to hide some of them
  function Links({ ids }: { ids: Array<string> }) {
    const [hidden, setHidden] = React.useState<Array<string>>([])
    hide = (id) => ReactDOM.flushSync(() => setHidden((h) => [...h, id]))
    return (
      <>
        {ids
          .filter((id) => !hidden.includes(id))
          .map((id) => (
            <Link key={id} to={`/${id}`}>
              {id}
            </Link>
          ))}
      </>
    )
  }
  let hide: (id: string) => void
  const preloaded = (preload: { mock: { calls: Array<Array<unknown>> } }) =>
    preload.mock.calls.map(([options]) => (options as { to: string }).to)

  test('two routers on a page batch independently', async () => {
    const first = setup({
      defaultPreload: batchedViewportPreload(),
      defaultPreloadDelay: 30,
    })
    const second = setup({
      defaultPreload: batchedViewportPreload(),
      defaultPreloadDelay: 60,
    })
    render(
      <>
        <RouterContextProvider router={first.router}>
          <Link to="/one">one</Link>
        </RouterContextProvider>
        <RouterContextProvider router={second.router}>
          <Link to="/two">two</Link>
        </RouterContextProvider>
      </>,
    )
    vi.useFakeTimers()
    intersect(screen.getByRole('link', { name: 'one' }))
    intersect(screen.getByRole('link', { name: 'two' }))
    await vi.advanceTimersByTimeAsync(30)
    expect(preloaded(first.preload)).toEqual(['/one'])
    expect(second.preload).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(30)
    expect(preloaded(second.preload)).toEqual(['/two'])
    expect(first.preload).toHaveBeenCalledTimes(1)
  })

  test('unmounting some links keeps the batch for the others', async () => {
    const { preload, mount } = setup({
      defaultPreload: batchedViewportPreload(),
      defaultPreloadDelay: 50,
    })
    mount(<Links ids={['a', 'b', 'c']} />)
    vi.useFakeTimers()
    for (const link of screen.getAllByRole('link')) {
      intersect(link)
    }
    act(() => hide('b'))
    expect(observed.size).toBe(2)
    await vi.advanceTimersByTimeAsync(50)
    expect(preloaded(preload)).toEqual(['/a', '/c'])
  })

  test('an entry that arrives after its link is gone is ignored', async () => {
    const { preload, mount } = setup({
      defaultPreload: batchedViewportPreload(),
      defaultPreloadDelay: 50,
    })
    mount(<Links ids={['a', 'b']} />)
    vi.useFakeTimers()
    const b = screen.getByRole('link', { name: 'b' })
    const callback = observed.get(b)!
    act(() => hide('b'))
    act(() => {
      callback(
        [
          {
            isIntersecting: true,
            target: b,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      )
    })
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(50)
    expect(preload).not.toHaveBeenCalled()
  })

  test('a preload that unmounts another queued link skips it', async () => {
    const { preload, mount } = setup({
      defaultPreload: batchedViewportPreload(),
      defaultPreloadDelay: 50,
    })
    preload.mockImplementation((options: any) => {
      if (options.to === '/a') {
        hide('b')
      }
      return Promise.resolve(undefined)
    })
    mount(<Links ids={['a', 'b', 'c']} />)
    vi.useFakeTimers()
    for (const link of screen.getAllByRole('link')) {
      intersect(link)
    }
    await vi.advanceTimersByTimeAsync(50)
    expect(preloaded(preload)).toEqual(['/a', '/c'])
    expect(vi.getTimerCount()).toBe(0)
  })
})
