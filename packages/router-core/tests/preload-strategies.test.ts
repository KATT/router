import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  batchedViewportPreload,
  createPreloadStrategy,
  intentPreload,
  preloadString,
  viewportPreload,
} from '../src'
import type { AnyRouter } from '../src'

afterEach(() => {
  vi.restoreAllMocks()
})

// Runs first, while the built-ins aren't loaded
test('an unknown preload string is ignored, before and after the load', async () => {
  const unhandled = vi.fn()
  process.on('unhandledRejection', unhandled)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  // What a Link with this string does as it mounts
  const mountLink = () => {
    const preload = vi.fn()
    preloadString('hover' as never)(
      {} as AnyRouter,
      { current: document.createElement('a') },
      preload,
      undefined,
    )
    return preload
  }

  const before = mountLink()
  await new Promise((resolve) => setTimeout(resolve, 10))
  expect(before).not.toHaveBeenCalled()
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('hover'))

  warn.mockClear()
  expect(mountLink()).not.toHaveBeenCalled()
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('hover'))
  expect(unhandled).not.toHaveBeenCalled()
  process.off('unhandledRejection', unhandled)
})

describe('the same options give the same strategy', () => {
  const factory = createPreloadStrategy<Record<string, unknown>>(() => () => {})

  test('createPreloadStrategy keys by primitive values, in any key order', () => {
    expect(factory({ a: 1, b: 'x' })).toBe(factory({ b: 'x', a: 1 }))
    expect(factory({ a: 1 })).not.toBe(factory({ a: '1' }))
    expect(factory({ a: null })).not.toBe(factory({ a: 'null' }))
    expect(factory({ a: true })).not.toBe(factory({ a: 'true' }))
    expect(factory({ a: Number.NaN })).not.toBe(factory({ a: null }))
  })

  test('missing, undefined and empty options are the same', () => {
    expect(factory()).toBe(factory({}))
    expect(factory({ delay: undefined })).toBe(factory({}))
    expect(factory(null as never)).toBe(factory())
  })

  test('nested objects and functions are never shared', () => {
    expect(factory({ nested: { a: 1 } })).not.toBe(
      factory({ nested: { a: 2 } }),
    )
    expect(factory({ fn: () => 1 })).not.toBe(factory({ fn: () => 2 }))
    // Even equal ones: such options have no memo
    const nested = { a: 1 }
    expect(factory({ nested })).not.toBe(factory({ nested }))
  })

  test('built-ins use the same rule', () => {
    expect(intentPreload()).toBe(intentPreload({}))
    expect(intentPreload({ delay: undefined })).toBe(intentPreload())
    expect(intentPreload(null as never)).toBe(intentPreload())
    expect(viewportPreload({ rootMargin: '1px', delay: 2 })).toBe(
      viewportPreload({ delay: 2, rootMargin: '1px' }),
    )
    expect(intentPreload({ delay: 1 })).not.toBe(intentPreload({ delay: 2 }))
    expect(
      viewportPreload({ rootMargin: { toString: () => '1px' } as never }),
    ).not.toBe(
      viewportPreload({ rootMargin: { toString: () => '1px' } as never }),
    )
    expect(batchedViewportPreload({ delay: undefined })).toBe(
      batchedViewportPreload(),
    )
  })
})
