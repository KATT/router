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
