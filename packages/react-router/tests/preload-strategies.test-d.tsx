import { expectTypeOf, test } from 'vitest'
import {
  batchedViewportPreload,
  createPreloadStrategy,
  createRootRoute,
  createRouter,
  viewportPreload,
} from '../src'
import type {
  BatchedViewportPreloadOptions,
  LinkPreloader,
  PreloadLink,
  PreloadOption,
  PreloadStrategy,
  PreloadStrategyFactory,
} from '../src'

test('preload strategy types are not any', () => {
  expectTypeOf<PreloadStrategy>().not.toBeAny()
  expectTypeOf<PreloadOption>().not.toBeAny()
  expectTypeOf<LinkPreloader>().not.toBeAny()
  expectTypeOf(viewportPreload).not.toBeAny()
  expectTypeOf(batchedViewportPreload).toEqualTypeOf<
    PreloadStrategyFactory<BatchedViewportPreloadOptions>
  >()
  expectTypeOf(batchedViewportPreload().tag).toEqualTypeOf(
    batchedViewportPreload,
  )
})

test('a user-land strategy infers its options and link', () => {
  const hoverPreload = createPreloadStrategy<{ delay?: number }>(
    (options) => (link) => {
      expectTypeOf(options).toEqualTypeOf<{ delay?: number }>()
      expectTypeOf(link).toEqualTypeOf<PreloadLink>()
      return { enter: link.preload }
    },
  )
  expectTypeOf(hoverPreload)
    .parameter(0)
    .toEqualTypeOf<{ delay?: number } | undefined>()
  // @ts-expect-error unknown option
  hoverPreload({ rootMargin: '1px' })
})

test('router options take strategies and their defaults', () => {
  const rootRoute = createRootRoute()
  createRouter({
    routeTree: rootRoute,
    defaultPreload: batchedViewportPreload(),
    preloadStrategyDefaults: [
      viewportPreload({ rootMargin: '200px' }),
      batchedViewportPreload({ delay: 150 }),
    ],
  })
  createRouter({
    routeTree: rootRoute,
    // @ts-expect-error not a strategy
    preloadStrategyDefaults: ['viewport'],
  })
})
