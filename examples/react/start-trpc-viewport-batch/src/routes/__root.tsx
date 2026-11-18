/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { TRPCOptionsProxy } from '@trpc/tanstack-react-query'
import type { AppRouter } from '~/trpc/router'
import type { PreloadMode } from '~/utils/preload-mode'
import { PreloadModeToggle } from '~/components/preload-mode-toggle'
import { RequestLog } from '~/components/request-log'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  trpc: TRPCOptionsProxy<AppRouter>
  preloadMode: PreloadMode
}>()({
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
  const { preloadMode } = Route.useRouteContext()
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased">
        <header className="bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link to="/" className="font-semibold">
              Viewport preload batching
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">defaultPreload</span>
              <PreloadModeToggle value={preloadMode} />
            </div>
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_22rem]">
          <main className="min-w-0">
            <Outlet />
          </main>
          <aside className="order-first lg:order-none">
            <div className="lg:sticky lg:top-20">
              <RequestLog />
            </div>
          </aside>
        </div>
        <Scripts />
      </body>
    </html>
  )
}
