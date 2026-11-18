import * as React from 'react'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import {
  batchTone,
  clearRequestLog,
  preloadedPosts,
  useRequestStats,
} from '~/utils/request-log'
import type { LoggedRequest } from '~/utils/request-log'
import { cn } from '~/utils/utils'

const summarize = (calls: Array<string>) => {
  const counts = new Map<string, number>()
  calls.forEach((call) => counts.set(call, (counts.get(call) ?? 0) + 1))
  return [...counts].map(([call, n]) => ({ call, n }))
}

/** Desktop: the full log in a sticky column. */
export function RequestLogPanel() {
  const { requests, calls, last } = useRequestStats()

  return (
    <Card className="flex max-h-[calc(100dvh-8.5rem)] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">tRPC requests</h2>
          <p className="text-muted-foreground text-xs">
            One row per HTTP request, newest first
          </p>
        </div>
        <Button variant="outline" onClick={clearRequestLog}>
          Clear
        </Button>
      </div>
      <div className="space-y-4 border-b px-4 py-4">
        <div className="grid grid-cols-3 gap-2">
          <StatTile value={requests.length} label="HTTP requests" />
          <StatTile value={calls} label="procedure calls" />
          <StatTile
            value={last ? last.calls.length : '–'}
            label="last batch"
            tone={last ? batchTone(last) : undefined}
          />
        </div>
        <div>
          <BatchBars requests={requests} max={36} className="h-12" />
          <ToneLegend className="mt-2" />
        </div>
      </div>
      <RequestList
        requests={requests}
        className="min-h-0 flex-1 overflow-y-auto p-2"
      />
    </Card>
  )
}

/**
 * Phones: a compact bar pinned to the bottom with the live counters and the
 * last few batches. Tapping it opens the full log as a bottom sheet.
 */
export function RequestLogDock() {
  const { requests, calls, last } = useRequestStats()
  const [open, setOpen] = React.useState(false)
  const closeRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!open) {
      return
    }
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="lg:hidden">
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="request-log-sheet"
          aria-label={`Request log: ${requests.length} HTTP requests, ${calls} procedure calls. Open the full log`}
          onClick={() => setOpen(true)}
          className="bg-card/95 border-mode/25 focus-visible:ring-mode/60 mx-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border py-2 pr-2.5 pl-3.5 text-left shadow-lg shadow-black/10 backdrop-blur-md outline-none focus-visible:ring-2"
        >
          <DockStat value={requests.length} label="requests" />
          <DockStat value={calls} label="calls" />
          <DockStat
            value={last ? last.calls.length : '–'}
            label="last"
            tone={last ? batchTone(last) : undefined}
          />
          <BatchBars
            requests={requests}
            max={16}
            className="h-8 min-w-0 flex-1"
          />
          <Chevron className="text-muted-foreground size-4 shrink-0" />
        </button>
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close the request log"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />
          <div
            id="request-log-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="tRPC request log"
            className="bg-card motion-safe:animate-sheet-in fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col rounded-t-2xl border-t shadow-2xl"
          >
            <div className="bg-muted-foreground/30 mx-auto mt-2 h-1 w-10 rounded-full" />
            <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-3">
              <h2 className="font-semibold">tRPC requests</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearRequestLog}>
                  Clear
                </Button>
                <Button ref={closeRef} onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="space-y-3 border-b px-4 pb-4">
              <div className="grid grid-cols-3 gap-2">
                <StatTile value={requests.length} label="HTTP requests" />
                <StatTile value={calls} label="procedure calls" />
                <StatTile
                  value={last ? last.calls.length : '–'}
                  label="last batch"
                  tone={last ? batchTone(last) : undefined}
                />
              </div>
              <ToneLegend />
            </div>
            <RequestList
              requests={requests}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            />
          </div>
        </>
      )}
    </div>
  )
}

function StatTile({
  value,
  label,
  tone,
}: {
  value: React.ReactNode
  label: string
  tone?: string
}) {
  return (
    <div
      data-tone={tone}
      className={cn(
        'bg-muted rounded-lg px-2.5 py-2',
        tone && 'bg-tone/12 ring-tone/30 ring-1 ring-inset',
      )}
    >
      <div
        key={String(value)}
        className={cn(
          'motion-safe:animate-pop text-2xl leading-none font-semibold tabular-nums',
          tone && 'text-tone-ink',
        )}
      >
        {value}
      </div>
      <div className="text-muted-foreground mt-1 text-[11px] leading-tight">
        {label}
      </div>
    </div>
  )
}

function DockStat({
  value,
  label,
  tone,
}: {
  value: React.ReactNode
  label: string
  tone?: string
}) {
  return (
    <div data-tone={tone} className="shrink-0">
      <div
        key={String(value)}
        className={cn(
          'motion-safe:animate-pop text-lg leading-none font-semibold tabular-nums',
          tone && 'text-tone-ink',
        )}
      >
        {value}
      </div>
      <div className="text-muted-foreground mt-0.5 text-[10px] font-medium tracking-wide uppercase">
        {label}
      </div>
    </div>
  )
}

/** The most recent requests as bars, oldest on the left; height = calls. */
function BatchBars({
  requests,
  max,
  className,
}: {
  requests: Array<LoggedRequest>
  max: number
  className?: string
}) {
  const recent = requests.slice(0, max).reverse()
  return (
    <div
      aria-hidden
      className={cn(
        'border-border flex items-end justify-end gap-0.5 overflow-hidden border-b',
        className,
      )}
    >
      {recent.map((request) => (
        <span
          key={request.id}
          data-tone={batchTone(request)}
          title={`#${request.id}: ${request.calls.length} calls`}
          className="bg-tone motion-safe:animate-grow w-1.5 shrink-0 origin-bottom rounded-t-[3px]"
          style={{
            height: `${Math.max(10, Math.min(request.calls.length / 24, 1) * 100)}%`,
          }}
        />
      ))}
    </div>
  )
}

function ToneLegend({ className }: { className?: string }) {
  const items = [
    { tone: 'single', label: '1 post / request' },
    { tone: 'small', label: '2–4' },
    { tone: 'big', label: '5+ batched' },
    { tone: 'neutral', label: 'list page' },
  ]
  return (
    <ul
      className={cn(
        'text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-[11px]',
        className,
      )}
    >
      {items.map(({ tone, label }) => (
        <li key={tone} data-tone={tone} className="flex items-center gap-1.5">
          <span className="bg-tone size-2 rounded-[3px]" />
          {label}
        </li>
      ))}
    </ul>
  )
}

const FLASH_MS = 1600

function RequestList({
  requests,
  className,
}: {
  requests: Array<LoggedRequest>
  className?: string
}) {
  return (
    <ol className={cn('space-y-1', className)}>
      {requests.map((request) => {
        const posts = preloadedPosts(request)
        // Only rows that just arrived flash, picking up where their flash
        // is, so opening the sheet doesn't light up the whole log
        const age = Date.now() - request.at
        return (
          <li
            key={request.id}
            data-tone={batchTone(request)}
            className={cn(
              'border-tone flex items-center gap-3 rounded-md border-l-[3px] py-1.5 pr-2 pl-2.5',
              age < FLASH_MS && 'motion-safe:animate-flash',
            )}
            style={age < FLASH_MS ? { animationDelay: `-${age}ms` } : undefined}
          >
            <span className="text-muted-foreground w-8 shrink-0 text-xs tabular-nums">
              #{request.id}
            </span>
            <span className="min-w-0 flex-1 font-mono text-xs leading-relaxed">
              {summarize(request.calls).map(({ call, n }) => (
                <span key={call} className="mr-2 inline-block">
                  {call}
                  {n > 1 && (
                    <span className="text-muted-foreground"> ×{n}</span>
                  )}
                </span>
              ))}
            </span>
            <span className="text-right">
              <span className="bg-tone/15 text-tone-ink ring-tone/30 inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums ring-1 ring-inset">
                {request.calls.length}
              </span>
              {posts > 0 && (
                <span className="text-muted-foreground mt-0.5 block text-[10px]">
                  {posts} {posts === 1 ? 'post' : 'posts'}
                </span>
              )}
            </span>
          </li>
        )
      })}
      {requests.length === 0 && (
        <li className="text-muted-foreground px-2 py-6 text-center text-sm">
          No requests yet. Scroll the list.
        </li>
      )}
    </ol>
  )
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M4 10l4-4 4 4" />
    </svg>
  )
}
