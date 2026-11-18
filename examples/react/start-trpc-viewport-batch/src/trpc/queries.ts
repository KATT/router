import {
  prefetchEntry,
  prefetchInfiniteEntry,
} from '@trpc/tanstack-react-query/unstable-handles'
import type { TRPCLoadEntries } from '@trpc/tanstack-react-query/unstable-handles'
import type { TRPCOptionsProxy } from '@trpc/tanstack-react-query'
import type { AppRouter } from './router'

type TRPC = TRPCOptionsProxy<AppRouter>

export const getNextPageParam = (page: { nextCursor?: number }) =>
  page.nextCursor

// What each page needs, from the URL alone. Loaders start these with
// `loadHandles` and don't wait for them; components suspend on the handles.
// Preloading a post link runs its loader, so its post and comments queries
// start in the same tick as every other link's in the batch.

export const postListEntries = (trpc: TRPC) =>
  ({
    posts: prefetchInfiniteEntry(
      trpc.posts.list,
      { limit: 20 },
      { getNextPageParam },
    ),
  }) satisfies TRPCLoadEntries

export const postEntries = (trpc: TRPC, postId: string) =>
  ({
    post: prefetchEntry(trpc.posts.byId, { id: Number(postId) }),
    comments: prefetchEntry(trpc.posts.comments, { postId: Number(postId) }),
  }) satisfies TRPCLoadEntries
