import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import {
  Link,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '../src'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// Preload strategies are React only for now: the shared types take them
test('a preload strategy is ignored with a development warning', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const strategy = vi.fn()
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <Link to="/" preload={strategy} preloadDelay={0}>
          Target
        </Link>
      ),
    }),
    history: createMemoryHistory(),
  })
  const preload = vi.spyOn(router, 'preloadRoute').mockResolvedValue(undefined)
  render(() => <RouterProvider router={router} />)
  const link = await screen.findByRole('link')
  fireEvent.mouseEnter(link)
  fireEvent.focus(link)
  expect(strategy).not.toHaveBeenCalled()
  expect(preload).not.toHaveBeenCalled()
  expect(warn).toHaveBeenCalledWith(
    expect.stringContaining('preload strategies'),
  )
})
