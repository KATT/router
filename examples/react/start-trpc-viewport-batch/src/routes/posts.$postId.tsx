import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  fromHandle,
  loadHandles,
} from '@trpc/tanstack-react-query/unstable-handles'
import * as React from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { postEntries } from '~/trpc/queries'

export const Route = createFileRoute('/posts/$postId')({
  // Starts `posts.byId` and returns at once; the post suspends on it
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
    <div className="space-y-4">
      <Link to="/">
        <Button variant="outline">← All posts</Button>
      </Link>
      <React.Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>
        <Post />
      </React.Suspense>
    </div>
  )
}

function Post() {
  const { trpc } = Route.useRouteContext()
  const handles = Route.useLoaderData()
  const { data: post } = useSuspenseQuery(fromHandle(trpc, handles.post))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{post.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 leading-relaxed">
        {post.body.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </CardContent>
    </Card>
  )
}
