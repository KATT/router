import { useSyncExternalStore } from 'react'

export type LoggedRequest = {
  id: number
  at: number
  calls: Array<string>
}

let requests: Array<LoggedRequest> = []
let nextId = 1
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

// `httpBatchStreamLink` puts every procedure of a batch in the path:
// /api/trpc/posts.byId,posts.byId?batch=1&input=...
export function logRequest(url: string) {
  const path = new URL(url, 'http://localhost').pathname
  const calls = decodeURIComponent(path.replace(/^\/api\/trpc\//, '')).split(
    ',',
  )
  requests = [{ id: nextId++, at: Date.now(), calls }, ...requests]
  notify()
}

export function clearRequestLog() {
  requests = []
  nextId = 1
  notify()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const EMPTY: Array<LoggedRequest> = []

export function useRequestLog() {
  return useSyncExternalStore(
    subscribe,
    () => requests,
    () => EMPTY,
  )
}

/**
 * How many post links a request preloads: each one calls `posts.byId` and
 * `posts.comments`, so it is the larger of the two counts.
 */
export function preloadedPosts(request: LoggedRequest) {
  const count = (name: string) =>
    request.calls.filter((call) => call === name).length
  return Math.max(count('posts.byId'), count('posts.comments'))
}

/**
 * How a request reads in the log. One that preloads no post (a page of the
 * list) is `neutral`. Otherwise one post per request is `single` (wasteful),
 * up to four is `small`, and five or more is a real batch, `big`.
 */
export type BatchTone = 'neutral' | 'single' | 'small' | 'big'

export function batchTone(request: LoggedRequest): BatchTone {
  const posts = preloadedPosts(request)
  if (posts === 0) {
    return 'neutral'
  }
  if (posts === 1) {
    return 'single'
  }
  return posts < 5 ? 'small' : 'big'
}

export function useRequestStats() {
  const requests = useRequestLog()
  const calls = requests.reduce((sum, r) => sum + r.calls.length, 0)
  return { requests, calls }
}
