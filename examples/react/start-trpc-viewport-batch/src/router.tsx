import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { routeTree } from './routeTree.gen'
import { createTrpcClient } from './trpc/client'
import type { AppRouter } from './trpc/router'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  })
  const trpc = createTRPCOptionsProxy<AppRouter>({
    client: createTrpcClient(),
    queryClient,
  })

  const router = createRouter({
    routeTree,
    context: { queryClient, trpc },
    scrollRestoration: true,
    // Each post link sets `preload` from `?preload=`; see `routes/index.tsx`
    defaultPreloadDelay: 100,
    defaultPreloadStaleTime: 0,
  })
  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
