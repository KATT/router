import { expectTypeOf, test } from 'vitest'
import {
  batchedViewportPreload,
  createPreloadStrategy,
  createRootRoute,
  createRouter,
} from '../src'
import type {
  AnyRouter,
  BatchedViewportPreloadOptions,
  PreloadHandlers,
  PreloadLink,
  PreloadOption,
  PreloadStrategy,
} from '../src'

test('a strategy gets the link and returns handlers', () => {
  const eager: PreloadStrategy = (link) => {
    expectTypeOf(link).toEqualTypeOf<PreloadLink>()
    expectTypeOf(link.router).toEqualTypeOf<AnyRouter>()
    expectTypeOf(link.delay).toEqualTypeOf<number | undefined>()
    return { enter: link.preload }
  }
  expectTypeOf(eager).returns.toEqualTypeOf<PreloadHandlers | void>()
  expectTypeOf(eager).toExtend<PreloadOption>()
})

test('factories take their own options', () => {
  const firstLinks = createPreloadStrategy<{ max?: number }>((options) => {
    expectTypeOf(options).toEqualTypeOf<{ max?: number }>()
    return () => {}
  })
  expectTypeOf(firstLinks)
    .parameter(0)
    .toEqualTypeOf<{ max?: number } | undefined>()
  expectTypeOf(firstLinks()).toEqualTypeOf<PreloadStrategy>()
  expectTypeOf(batchedViewportPreload)
    .parameter(0)
    .toEqualTypeOf<BatchedViewportPreloadOptions | undefined>()
})

test('defaultPreload takes a strategy', () => {
  createRouter({
    routeTree: createRootRoute(),
    defaultPreload: batchedViewportPreload({ delay: 150 }),
  })
  createRouter({
    routeTree: createRootRoute(),
    // @ts-expect-error not a preload mode
    defaultPreload: 'hover',
  })
})
