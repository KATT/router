import { TRPCError, initTRPC } from '@trpc/server'
import { z } from 'zod'

const t = initTRPC.create()

const WORDS =
  'router loader preload viewport batch request scroll link cache stream query tick data screen list post fetch observer delay flush'.split(
    ' ',
  )

const words = (seed: number, count: number) =>
  Array.from(
    { length: count },
    (_, i) => WORDS[(seed * 7 + i * 13 + i * i) % WORDS.length],
  ).join(' ')

const POSTS = Array.from({ length: 500 }, (_, i) => {
  const id = i + 1
  const title = words(id, 4)
  return {
    id,
    title: `#${id} ${title[0]!.toUpperCase()}${title.slice(1)}`,
    excerpt: `${words(id + 1, 14)}.`,
    body: Array.from({ length: 4 }, (_, p) => `${words(id + p, 40)}.`),
  }
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const appRouter = t.router({
  posts: t.router({
    list: t.procedure
      .input(
        z.object({
          cursor: z.number().nullish(),
          limit: z.number().min(1).max(50).default(20),
        }),
      )
      .query(async ({ input }) => {
        await sleep(150)
        const start = input.cursor ?? 0
        const end = start + input.limit
        return {
          items: POSTS.slice(start, end).map(({ id, title, excerpt }) => ({
            id,
            title,
            excerpt,
          })),
          nextCursor: end < POSTS.length ? end : undefined,
        }
      }),
    byId: t.procedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        await sleep(300)
        const post = POSTS[input.id - 1]
        if (!post) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }
        return post
      }),
  }),
})

export type AppRouter = typeof appRouter
