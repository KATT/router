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

  test('an inline search function does not re-add listeners', () => {
    const add = vi.spyOn(Element.prototype, 'addEventListener')
    const remove = vi.spyOn(Element.prototype, 'removeEventListener')
    const { mount } = setup()
    mount(<App preload="intent" />)
    const link = screen.getByRole('link')
    const added = listenerCalls(add, link).length
    expect(added).toBeGreaterThan(0)

    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'rerender' }))
    }
    expect(listenerCalls(add, link)).toHaveLength(added)
    expect(listenerCalls(remove, link)).toEqual([])
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

