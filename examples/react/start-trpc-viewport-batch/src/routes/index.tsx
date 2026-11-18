import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  fromHandle,
  loadHandles,
} from '@trpc/tanstack-react-query/unstable-handles'
import * as React from 'react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { getNextPageParam, postListEntries } from '~/trpc/queries'

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
  const { preloadMode } = Route.useRouteContext()
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Every card links to a post whose loader starts{' '}
        <code className="text-foreground">trpc.posts.byId</code>. Scroll and
        watch the request log. With <b className="text-foreground">viewport</b>,
        each link preloads on its own timer, so tRPC's batch link sends many
        small requests. With <b className="text-foreground">viewport-batch</b>{' '}
        (the router's{' '}
        <code className="text-foreground">batchedViewportPreload()</code>),
        links wait for scrolling to settle, then preload together in one
        request. Current mode: <b className="text-foreground">{preloadMode}</b>.
      </p>
      <React.Suspense fallback={<PostListSkeleton />}>
        <PostList />
      </React.Suspense>
    </div>
  )
}

function PostListSkeleton() {
  return (
    <ul className="grid gap-3">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}>
          <Skeleton className="h-[86px] rounded-xl" />
        </li>
      ))}
    </ul>
  )
}

function PostList() {
  const { trpc } = Route.useRouteContext()
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
              <PostLink post={post} />
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
}: {
  post: { id: number; title: string; excerpt: string }
}) {
  return (
    <Link
      to="/posts/$postId"
      params={{ postId: String(post.id) }}
      className="block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
    >
      <Card className="hover:bg-accent transition-colors">
        <CardHeader>
          <CardTitle>{post.title}</CardTitle>
          <CardDescription>{post.excerpt}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}
