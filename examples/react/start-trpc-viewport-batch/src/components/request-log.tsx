import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { clearRequestLog, useRequestLog } from '~/utils/request-log'

const summarize = (calls: Array<string>) => {
  const counts = new Map<string, number>()
  calls.forEach((call) => counts.set(call, (counts.get(call) ?? 0) + 1))
  return [...counts].map(([call, n]) => (n > 1 ? `${call} ×${n}` : call))
}

export function RequestLog() {
  const requests = useRequestLog()
  const calls = requests.reduce((sum, r) => sum + r.calls.length, 0)

  return (
    <Card className="flex max-h-[calc(100vh-7rem)] flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">tRPC requests</CardTitle>
        <Button variant="outline" onClick={clearRequestLog}>
          Clear
        </Button>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-muted rounded-md p-2">
            <div className="text-2xl font-semibold tabular-nums">
              {requests.length}
            </div>
            <div className="text-muted-foreground">HTTP requests</div>
          </div>
          <div className="bg-muted rounded-md p-2">
            <div className="text-2xl font-semibold tabular-nums">{calls}</div>
            <div className="text-muted-foreground">procedure calls</div>
          </div>
        </div>
        <ol className="min-h-0 space-y-1.5 overflow-y-auto text-sm">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex items-start justify-between gap-2 border-b pb-1.5"
            >
              <span className="text-muted-foreground tabular-nums">
                #{request.id}
              </span>
              <span className="flex-1 font-mono text-xs break-all">
                {summarize(request.calls).join(', ')}
              </span>
              <Badge>{request.calls.length}</Badge>
            </li>
          ))}
          {requests.length === 0 && (
            <li className="text-muted-foreground">
              No requests yet. Scroll the list.
            </li>
          )}
        </ol>
      </CardContent>
    </Card>
  )
}
