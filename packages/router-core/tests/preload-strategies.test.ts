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

test('preloadString gives the built-in strategy a string stands for', () => {
  expect(typeof preloadString('intent')).toBe('function')
  expect(typeof preloadString('viewport')).toBe('function')
  expect(typeof preloadString('render')).toBe('function')
  expect(preloadString('hover')).toBeUndefined()
  // No prototype lookups
  expect(preloadString('toString')).toBeUndefined()
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
