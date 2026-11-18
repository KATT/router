import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  fromHandle,
  loadHandles,
} from '@trpc/tanstack-react-query/unstable-handles'
import * as React from 'react'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { postEntries } from '~/trpc/queries'

export const Route = createFileRoute('/posts/$postId')({
  // Starts `posts.byId` and `posts.comments` in the same tick and returns at
  // once; the post and its comments each suspend on their own handle
  loader: async ({ context, params }) => {
    const [handles] = await loadHandles(
      context.trpc,
      postEntries(context.trpc, params.postId),
    )
    return handles
  },
  component: PostPage,
})

function PostPage() {
  return (
    <div className="space-y-5">
      <Link
        to="/"
        className="text-mode-ink hover:bg-mode/10 focus-visible:ring-mode/60 -ml-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium outline-none focus-visible:ring-2"
      >
        <span aria-hidden>←</span> All posts
      </Link>
      <React.Suspense fallback={<Skeleton className="h-80 rounded-xl" />}>
        <Post />
      </React.Suspense>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Comments</h2>
        <React.Suspense fallback={<CommentsSkeleton />}>
          <Comments />
        </React.Suspense>
      </section>
    </div>
  )
}

function Post() {
  const { trpc } = Route.useRouteContext()
  const handles = Route.useLoaderData()
  const { data: post } = useSuspenseQuery(fromHandle(trpc, handles.post))

  return (
    <Card>
      <CardHeader className="gap-3">
        <span className="bg-mode/10 text-mode-ink w-fit rounded-md px-2 py-0.5 font-mono text-xs font-semibold">
          post {post.id}
        </span>
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance">
          {post.title.replace(/^#\d+\s*/, '')}
        </h1>
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-3 leading-relaxed">
        {post.body.map((paragraph, i) => (
          <p key={i} className="first-letter:uppercase">
            {paragraph}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}

function Comments() {
  const { trpc } = Route.useRouteContext()
  const handles = Route.useLoaderData()
  const { data: comments } = useSuspenseQuery(
    fromHandle(trpc, handles.comments),
  )

  return (
    <ul className="space-y-2">
      {comments.map((comment) => (
        <li
          key={comment.id}
          className="bg-card flex gap-3 rounded-xl border p-3.5 shadow-xs"
        >
          <span
            aria-hidden
            className="bg-mode/15 text-mode-ink grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold"
          >
            {comment.author[0]}
          </span>
          <div className="min-w-0">
            <p className="text-sm">
              <span className="font-semibold">{comment.author}</span>{' '}
              <span className="text-muted-foreground text-xs">
                · {comment.age}
              </span>
            </p>
            <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
              {comment.body}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function CommentsSkeleton() {
  return (
    <ul className="space-y-2">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i}>
          <Skeleton className="h-[72px] rounded-xl" />
        </li>
      ))}
    </ul>
  )
}
