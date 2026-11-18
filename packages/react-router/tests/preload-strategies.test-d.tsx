import { expectTypeOf, test } from 'vitest'
import {
  Link,
  batchedViewportPreload,
  createPreloadStrategy,
  createRouter,
  preloadDefaults,
  viewportPreload,
} from '../src'
import type {
  DefaultPreloadOptions,
  PreloadLink,
  PreloadOption,
  PreloadStrategy,
  PreloadStrategyFactory,
  RouterOptions,
  ViewportPreloadOptions,
} from '../src'

test('preload strategy types reach consumers, not as any', () => {
  expectTypeOf<PreloadStrategy>().not.toBeAny()
  expectTypeOf<PreloadOption>().not.toBeAny()
  expectTypeOf<DefaultPreloadOptions>().not.toBeAny()
  expectTypeOf(viewportPreload).not.toBeAny()
  expectTypeOf(viewportPreload).toEqualTypeOf<
    PreloadStrategyFactory<ViewportPreloadOptions>
  >()
  expectTypeOf<RouterOptions<any, 'never'>['defaultPreload']>().toEqualTypeOf<
    PreloadOption | undefined
  >()

  // Parameters are typed from context, not implicitly any
  const strategy: PreloadStrategy = (router) => (link) => {
    expectTypeOf(link).toEqualTypeOf<PreloadLink>()
    expectTypeOf(router.options.defaultPreloadDelay).toEqualTypeOf<
      number | undefined
    >()
  }
  expectTypeOf(strategy).toMatchTypeOf<PreloadOption>()
})

test('a custom strategy and preloadDefaults are typed from the factory', () => {
  const waitPreload = createPreloadStrategy(
    (options: { wait?: number }) => (link) => ({ enter: link.preload }),
  )
  expectTypeOf(waitPreload).toEqualTypeOf<
    PreloadStrategyFactory<{ wait?: number }>
  >()

  createRouter({
    routeTree: undefined as any,
    defaultPreload: waitPreload({ wait: 1 }),
    defaultPreloadOptions: [
      preloadDefaults(waitPreload, { wait: 70 }),
      preloadDefaults(batchedViewportPreload, { delay: 150 }),
    ],
  })

  // @ts-expect-error not an option of waitPreload
  preloadDefaults(waitPreload, { delay: 1 })
  // @ts-expect-error rootMargin is a string
  preloadDefaults(viewportPreload, { rootMargin: 1 })
  // @ts-expect-error not a preload mode
  createRouter({ routeTree: undefined as any, defaultPreload: 'hover' })

  expectTypeOf(Link).parameter(0).toHaveProperty('preload')
})
