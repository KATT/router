import { createIsomorphicFn } from '@tanstack/react-start'
import {
  createTRPCClient,
  httpBatchStreamLink,
  unstable_localLink,
} from '@trpc/client'
import { appRouter } from './router'
import type { AppRouter } from './router'
import { logRequest } from '~/utils/request-log'

// The server calls procedures directly; the browser batches them over HTTP and
// logs every request so the page can show how many were sent.
const getLink = createIsomorphicFn()
  .server(() =>
    unstable_localLink({ router: appRouter, createContext: async () => ({}) }),
  )
  .client(() =>
    httpBatchStreamLink<AppRouter>({
      url: '/api/trpc',
      fetch: (url, init) => {
        logRequest(String(url))
        return fetch(url, init as RequestInit)
      },
    }),
  )

export function createTrpcClient() {
  return createTRPCClient<AppRouter>({ links: [getLink()] })
}
