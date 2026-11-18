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
      link.element?.addEventListener('pointerenter', link.preload)
      return () =>
        link.element?.removeEventListener('pointerenter', link.preload)
    },
  )
  expectTypeOf(eager)
    .parameter(0)
    .toEqualTypeOf<{ onTouch?: boolean } | undefined>()
  // A strategy returns only its cleanup
  expectTypeOf<ReturnType<LinkPreloader>>().toEqualTypeOf<(() => void) | void>()
  // @ts-expect-error not a cleanup
  createPreloadStrategy(() => (link) => ({ enter: link.preload }))
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
