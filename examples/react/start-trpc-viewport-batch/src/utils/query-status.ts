import { hashKey, useQueryClient } from '@tanstack/react-query'
import type { Query, QueryKey } from '@tanstack/react-query'
import * as React from 'react'

export type QueryStatus = 'idle' | 'fetching' | 'cached' | 'error'

const statusOf = (query: Query | undefined): QueryStatus => {
  if (!query) {
    return 'idle'
  }
  if (query.state.fetchStatus === 'fetching') {
    return 'fetching'
  }
  if (query.state.status === 'success') {
    return 'cached'
  }
  return query.state.status === 'error' ? 'error' : 'idle'
}

/**
 * Where a group of queries is, read straight from the React Query cache:
 * `fetching` while any of them is, `cached` once all are, `error` if one
 * failed, otherwise `idle`. It only watches; unlike `useQuery`, it never adds
 * a query to the cache or fetches one. Clearing the cache makes it `idle`.
 */
export function useQueryStatus(queryKeys: Array<QueryKey>): QueryStatus {
  const queryCache = useQueryClient().getQueryCache()
  const hashes = queryKeys.map((key) => hashKey(key)).join('\n')
  const subscribe = React.useCallback(
    (onChange: () => void) => queryCache.subscribe(onChange),
    [queryCache],
  )
  const getSnapshot = React.useCallback((): QueryStatus => {
    const statuses = hashes
      .split('\n')
      .map((hash) => statusOf(queryCache.get(hash)))
    if (statuses.includes('fetching')) {
      return 'fetching'
    }
    if (statuses.includes('error')) {
      return 'error'
    }
    return statuses.every((s) => s === 'cached') ? 'cached' : 'idle'
  }, [queryCache, hashes])
  return React.useSyncExternalStore(subscribe, getSnapshot, () => 'idle')
}
