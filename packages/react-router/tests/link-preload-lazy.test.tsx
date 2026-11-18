import path from 'node:path'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

// The setup file loads the built-in strategies up front. Each test here gets
// fresh modules instead, so its first string-mode Link mounts before they load.
const builtinsPath = path.resolve(
  __dirname,
  '../../router-core/dist/esm/preload-strategies/builtins.js',
)
let builtinsLoads: number

beforeEach(() => {
  vi.resetModules()
  builtinsLoads = 0
  vi.doMock(builtinsPath, async (importOriginal) => {
    builtinsLoads++
    return importOriginal()
  })
})

afterEach(() => {
  cleanup()
  vi.doUnmock(builtinsPath)
})

async function setup() {
  const src = await import('../src')
  const core = await import('@tanstack/router-core')
  const router = src.createRouter({
    routeTree: src.createRootRoute(),
    history: src.createMemoryHistory(),
    isServer: false,
  })
  const preloadRoute = vi
    .spyOn(router, 'preloadRoute')
    .mockResolvedValue(undefined)
  const links = (...modes: Array<'intent' | 'render'>) => (
    <src.RouterContextProvider router={router}>
      {modes.map((mode, i) => (
        <src.Link key={i} to="/target" preload={mode} preloadDelay={0}>
          {`${mode} ${i}`}
        </src.Link>
      ))}
    </src.RouterContextProvider>
  )
  // Resolves once the Links that are waiting for the chunk have started
  const loaded = () =>
    act(async () => {
      await core.loadPreloadStrategy('intent')
    })
  return { core, src, preloadRoute, links, loaded }
}

test('a string-mode Link preloads once the built-in strategies load', async () => {
  const { preloadRoute, links, loaded } = await setup()
  const view = render(links('intent'))
  const link = view.getByText('intent 0')

  // Before the chunk loads the Link has no listeners yet
  fireEvent.mouseEnter(link)
  expect(preloadRoute).not.toHaveBeenCalled()

  await loaded()
  fireEvent.mouseEnter(link)
  expect(preloadRoute).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ to: '/target' }),
  )
})

test('a Link that unmounts before the built-in strategies load starts nothing', async () => {
  const { preloadRoute, links, loaded } = await setup()
  const view = render(links('render'))
  view.unmount()

  await loaded()
  expect(preloadRoute).not.toHaveBeenCalled()
})

test('the built-in strategies load once, then Links start at once', async () => {
  const { core, preloadRoute, links, loaded } = await setup()
  const view = render(links('render', 'render', 'intent'))
  expect(preloadRoute).not.toHaveBeenCalled()

  await loaded()
  expect(preloadRoute).toHaveBeenCalledTimes(2)

  // A Link that mounts later starts in its first effect
  view.rerender(links('render', 'render', 'intent', 'render'))
  expect(preloadRoute).toHaveBeenCalledTimes(3)
  fireEvent.mouseEnter(view.getByText('intent 2'))
  expect(preloadRoute).toHaveBeenCalledTimes(4)

  expect(builtinsLoads).toBe(1)
  // The strings run the same strategies as the factories' default options
  expect(await core.loadPreloadStrategy('intent')).toBe(core.intentPreload())
  expect(await core.loadPreloadStrategy('viewport')).toBe(
    core.viewportPreload(),
  )
  expect(await core.loadPreloadStrategy('render')).toBe(core.renderPreload())
  expect(builtinsLoads).toBe(1)
})
