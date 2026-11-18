import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  batchedViewportPreload,
  createPreloadStrategy,
  intentPreload,
  viewportPreload,
} from '../src'
import type { AnyRouter } from '../src'

afterEach(() => {
  vi.restoreAllMocks()
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

// A React Link runs `intentPreload()` through its own event props, as it
// does `'intent'`; another strategy can still call it with an element
test('intentPreload() called directly listens to the element itself', () => {
  vi.useFakeTimers()
  const element = document.createElement('a')
  const child = document.createElement('span')
  element.append(child)
  document.body.append(element)
  const preload = vi.fn()
  const stop = intentPreload({ delay: 10 })(
    { options: {} } as AnyRouter,
    { current: element },
    preload,
    undefined,
  )
  element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  // Moving onto its own child isn't a new enter
  child.dispatchEvent(
    new MouseEvent('mouseover', { bubbles: true, relatedTarget: element }),
  )
  vi.advanceTimersByTime(10)
  expect(preload).toHaveBeenCalledTimes(1)
  element.dispatchEvent(new Event('touchstart'))
  expect(preload).toHaveBeenCalledTimes(2)

  stop?.()
  element.dispatchEvent(new Event('touchstart'))
  expect(preload).toHaveBeenCalledTimes(2)
  element.remove()
  vi.useRealTimers()
})
