import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import {
  fromHandle,
  loadHandles,
} from '@trpc/tanstack-react-query/unstable-handles'
import * as React from 'react'
import { Skeleton } from '~/components/ui/skeleton'
import { linkPreload } from '~/utils/preload-mode'
import type { PreloadMode } from '~/utils/preload-mode'
import { useViewportBatchPreload } from '~/utils/viewport-preloader'
import { getNextPageParam, postListEntries } from '~/trpc/queries'
import { useQueryStatus } from '~/utils/query-status'
import type { QueryStatus } from '~/utils/query-status'
import { cn } from '~/utils/utils'

export const Route = createFileRoute('/')({
  // Starts the first page and returns at once; the list suspends on it
  loader: async ({ context }) => {
    const [handles] = await loadHandles(
      context.trpc,
      postListEntries(context.trpc),
    )
    return handles
  },
  component: PostListPage,
})

function PostListPage() {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          500 posts. How many requests?
        </h1>
        <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
          Each card links to a post whose loader starts{' '}
          <code className="text-foreground">posts.byId</code> and{' '}
          <code className="text-foreground">posts.comments</code>. Scroll and
          watch the dots and the request log. With{' '}
          <b data-mode="viewport" className="text-mode-ink">
            viewport
          </b>
          , each link preloads on its own timer, so tRPC sends lots of small
          requests. With{' '}
          <b data-mode="viewport-batch" className="text-mode-ink">
            viewport-batch
          </b>
          , one shared observer waits for scrolling to settle, then preloads
          every link in view in a single request.
        </p>
        <StatusLegend />
      </section>
      <React.Suspense fallback={<PostListSkeleton />}>
        <PostList />
      </React.Suspense>
    </div>
  )
}

const STATUS_LABELS: Record<QueryStatus, string> = {
  idle: 'not loaded',
  fetching: 'loading',
  cached: 'preloaded',
  error: 'failed',
}

function StatusLegend() {
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {(['idle', 'fetching', 'cached'] as const).map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <StatusDot status={status} />
          {STATUS_LABELS[status]}
        </li>
      ))}
    </ul>
  )
}

function StatusDot({ status }: { status: QueryStatus }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2.5 shrink-0 rounded-full transition-colors duration-300',
        status === 'idle' && 'ring-muted-foreground/45 ring-[1.5px] ring-inset',
        status === 'fetching' &&
          'bg-mode ring-mode/25 ring-4 motion-safe:animate-pulse',
        status === 'cached' && 'bg-ready',
        status === 'error' && 'bg-tone',
      )}
      data-tone={status === 'error' ? 'single' : undefined}
    />
  )
}

function PostListSkeleton() {
  return (
    <ul className="grid gap-3">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}>
          <Skeleton className="h-[100px] rounded-xl" />
        </li>
      ))}
    </ul>
  )
}

function PostList() {
  const { trpc } = Route.useRouteContext()
  const { preload } = Route.useSearch()
  const handles = Route.useLoaderData()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      fromHandle(trpc, handles.posts, { getNextPageParam }),
    )
  const sentinel = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = sentinel.current
    if (!el || !hasNextPage) {
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return (
    <>
      <ul className="grid gap-3">
        {data.pages.flatMap((page) =>
          page.items.map((post) => (
            <li key={post.id}>
              <PostLink post={post} mode={preload} />
            </li>
          )),
        )}
      </ul>
      <div
        ref={sentinel}
        className="text-muted-foreground py-6 text-center text-sm"
      >
        {hasNextPage ? 'Loading more…' : 'The end.'}
      </div>
    </>
  )
}

function PostLink({
  post,
  mode,
}: {
  post: { id: number; title: string; excerpt: string }
  mode: PreloadMode
}) {
  const router = useRouter()
  const { trpc } = Route.useRouteContext()
  const postId = String(post.id)
  // In `viewport-batch`, router preloading is off; the shared batch preloads
  // the route instead, which runs its loader and so its tRPC queries.
  const ref = useViewportBatchPreload(
    () => router.preloadRoute({ to: '/posts/$postId', params: { postId } }),
    mode === 'viewport-batch',
  )
  // Only reads the cache, so the dot shows what preloading did
  const status = useQueryStatus([
    trpc.posts.byId.queryKey({ id: post.id }),
    trpc.posts.comments.queryKey({ postId: post.id }),
  ])

  return (
    <Link
      ref={ref}
      to="/posts/$postId"
      params={{ postId }}
      // From `?preload=`, not `defaultPreload`: a new mode re-renders the
      // links with it, on the server and in the browser alike
      preload={linkPreload(mode)}
      className="group focus-visible:ring-mode/60 block rounded-xl outline-none focus-visible:ring-2"
    >
      <article
        className={cn(
          'bg-card text-card-foreground flex gap-3 rounded-xl border p-3.5 shadow-sm sm:gap-4 sm:p-4 transition-[border-color,box-shadow] duration-300 group-hover:shadow-md',
          status === 'fetching'
            ? 'border-mode/60 ring-mode/15 ring-4'
            : 'group-hover:border-mode/40',
        )}
      >
        <span className="bg-mode/10 text-mode-ink grid h-9 min-w-9 shrink-0 place-items-center rounded-lg px-1.5 font-mono text-sm font-semibold tabular-nums">
          {post.id}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[15px] leading-snug font-semibold sm:text-base">
              {post.title.replace(/^#\d+\s*/, '')}
            </h2>
            <span
              className="text-muted-foreground mt-0.5 flex shrink-0 items-center gap-1.5 text-[11px] font-medium"
              title={`posts.byId + posts.comments: ${STATUS_LABELS[status]}`}
            >
              <StatusDot status={status} />
              <span className="sr-only sm:not-sr-only">
                {STATUS_LABELS[status]}
              </span>
            </span>
          </div>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-relaxed first-letter:uppercase">
            {post.excerpt}
          </p>
        </div>
      </article>
    </Link>
  )
}
