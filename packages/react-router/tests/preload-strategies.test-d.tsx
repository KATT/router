import { expectTypeOf, test } from 'vitest'
import {
  Link,
  batchedViewportPreload,
  createPreloadStrategy,
  createRootRoute,
  createRouter,
  intentPreload,
} from '../src'
import type {
  AnyRouter,
  LinkPreloader,
  PreloadHandlers,
  PreloadLink,
  PreloadOption,
  PreloadStrategy,
} from '../src'

test('strategy types are not any', () => {
  expectTypeOf<PreloadStrategy>().not.toBeAny()
  expectTypeOf<PreloadOption>().not.toBeAny()
  expectTypeOf<LinkPreloader>().not.toBeAny()
  expectTypeOf(intentPreload).not.toBeAny()
  expectTypeOf(createPreloadStrategy).not.toBeAny()
  expectTypeOf(
    batchedViewportPreload({ delay: 150 }),
  ).toEqualTypeOf<PreloadStrategy>()
})

test('createPreloadStrategy types its stages from context', () => {
  const eager = createPreloadStrategy<{ onTouch?: boolean }>(
    (options, router) => (link) => {
      expectTypeOf(options).toEqualTypeOf<{ onTouch?: boolean }>()
      expectTypeOf(router).toEqualTypeOf<AnyRouter>()
      expectTypeOf(link).toEqualTypeOf<PreloadLink>()
      return { enter: link.preload }
    },
  )
  expectTypeOf(eager)
    .parameter(0)
    .toEqualTypeOf<{ onTouch?: boolean } | undefined>()
  expectTypeOf<
    ReturnType<LinkPreloader>
  >().toEqualTypeOf<PreloadHandlers | void>()
})

test('preload options take strings and strategies only', () => {
  const rootRoute = createRootRoute()
  createRouter({ routeTree: rootRoute, defaultPreload: intentPreload() })
  createRouter({ routeTree: rootRoute, defaultPreload: 'viewport' })
  // @ts-expect-error not a preload mode
  createRouter({ routeTree: rootRoute, defaultPreload: 'hover' })

  expectTypeOf(Link<AnyRouter, string, '/'>)
    .parameter(0)
    .toHaveProperty('preload')
    .toEqualTypeOf<PreloadOption | undefined>()
})
