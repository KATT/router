/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  retainSearchParams,
} from '@tanstack/react-router'
import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { TRPCOptionsProxy } from '@trpc/tanstack-react-query'
import type { AppRouter } from '~/trpc/router'
import { preloadSearchSchema } from '~/utils/preload-mode'
import { PreloadModeToggle } from '~/components/preload-mode-toggle'
import { RequestLogDock, RequestLogPanel } from '~/components/request-log'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  trpc: TRPCOptionsProxy<AppRouter>
}>()({
  // `?preload=` is valid on every route, and every navigation keeps it
  validateSearch: preloadSearchSchema,
  search: { middlewares: [retainSearchParams(['preload'])] },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Viewport preload batching · TanStack Router + tRPC' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  const { preload } = Route.useSearch()
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      {/* `data-mode` gives the whole page the current mode's accent colour */}
      <body
        data-mode={preload}
        className="text-foreground min-h-dvh antialiased"
      >
        {/* On phones the title row (h-14) scrolls away and the mode toggle
            stays pinned; from `lg` up it is one sticky row */}
        <header className="bg-background lg:bg-background/85 sticky -top-14 z-20 backdrop-blur-md lg:top-0">
          <div className="mx-auto max-w-6xl px-4 lg:flex lg:items-center lg:justify-between lg:gap-6 lg:py-3">
            <Link
              to="/"
              className="flex h-14 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 lg:h-auto"
            >
              <BatchMark />
              <span>
                <span className="block leading-tight font-semibold tracking-tight">
                  Viewport preload batching
                </span>
                <span className="text-muted-foreground block text-xs">
                  TanStack Router + tRPC httpBatchStreamLink
                </span>
              </span>
            </Link>
            <div className="pb-3 lg:pb-0">
              <PreloadModeToggle value={preload} />
            </div>
          </div>
          <div className="via-mode/60 h-px bg-linear-to-r from-transparent to-transparent" />
        </header>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-5 pb-28 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pt-8 lg:pb-12">
          <main className="min-w-0">
            <Outlet />
          </main>
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <RequestLogPanel />
            </div>
          </aside>
        </div>
        <RequestLogDock />
        <Scripts />
      </body>
    </html>
  )
}

/** Many thin requests merging into one: the logo, in the mode's colour. */
function BatchMark() {
  return (
    <span className="bg-mode text-mode-foreground grid size-9 shrink-0 place-items-center rounded-xl shadow-sm transition-colors">
      <svg viewBox="0 0 20 20" aria-hidden className="size-5" fill="none">
        <path
          d="M3 5h5M3 10h5M3 15h5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M8 5c3 0 3 5 6 5M8 15c3 0 3-5 6-5M8 10h6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect
          x="14"
          y="7"
          width="3.5"
          height="6"
          rx="1.5"
          fill="currentColor"
        />
      </svg>
    </span>
  )
}
