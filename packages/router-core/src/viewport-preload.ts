type ViewportPreloadBatch = {
  q: Map<object, () => void>
  t?: ReturnType<typeof setTimeout>
}

const batches = new WeakMap<object, ViewportPreloadBatch>()

/**
 * Queues (`run` given) or drops (`run` omitted) a link's viewport preload in
 * the router's shared batch. Passing `delay` restarts the batch timer; when it
 * fires, every queued preload runs in the same tick. Leave `delay` out to drop
 * a link (eg. on unmount) without restarting the timer.
 */
export function queueViewportPreload(
  router: object,
  key: object,
  run?: () => void,
  delay?: number,
): void {
  let batch = batches.get(router)
  if (!batch) {
    if (!run) {
      return
    }
    batches.set(router, (batch = { q: new Map() }))
  }
  if (run) {
    batch.q.set(key, run)
  } else {
    batch.q.delete(key)
  }
  if (delay === undefined && batch.q.size) {
    return
  }
  clearTimeout(batch.t)
  const flush = batch
  flush.t = flush.q.size
    ? setTimeout(() => {
        const queued = flush.q
        flush.q = new Map()
        flush.t = undefined
        queued.forEach((preload) => preload())
      }, delay)
    : undefined
}
