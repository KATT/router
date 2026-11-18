import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { clearRequestLog } from '~/utils/request-log'
import { PRELOAD_MODES } from '~/utils/preload-mode'
import type { PreloadMode } from '~/utils/preload-mode'

const MODE_HINTS: Record<PreloadMode, string> = {
  off: 'No preloading: a post loads only once you open it.',
  render: 'Every link preloads as soon as it renders, seen or not.',
  viewport:
    'Each link preloads on its own as it scrolls in: many tiny requests.',
  'viewport-batch':
    'Links in view preload together once scrolling settles: a few big batches.',
}

export function PreloadModeToggle({ value }: { value: PreloadMode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const switchTo = (mode: PreloadMode) => {
    // Nothing of the other mode's is kept, so every mode starts from the
    // same empty caches and the request log counts only its own requests.
    clearRequestLog()
    queryClient.clear()
    router.clearCache()
    // Same page, new `?preload=`; replace, so Back doesn't flip the mode
    // without clearing the caches
    void navigate({
      to: '.',
      search: (prev) => ({ ...prev, preload: mode }),
      replace: true,
    })
  }

  return (
    <div className="flex flex-col gap-1.5 lg:items-end">
      <ToggleGroup
        type="single"
        value={value}
        aria-label="Preload mode"
        // Full width on phones; scrolls within itself if it ever overflows
        className="flex w-full overflow-x-auto lg:w-auto"
        onValueChange={(mode) => {
          if (mode && mode !== value) {
            switchTo(mode as PreloadMode)
          }
        }}
      >
        {PRELOAD_MODES.map((mode) => (
          <ToggleGroupItem
            key={mode}
            value={mode}
            data-mode={mode}
            className="flex-auto"
          >
            <span
              aria-hidden
              className="bg-mode hidden size-1.5 rounded-full in-data-[state=on]:bg-current sm:inline-block"
            />
            {mode}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p
        className="text-muted-foreground flex items-start gap-1.5 text-xs leading-snug lg:whitespace-nowrap"
        aria-live="polite"
      >
        <span
          aria-hidden
          className="bg-mode mt-[0.3rem] size-1.5 shrink-0 rounded-full"
        />
        <span>
          <b className="text-mode-ink font-semibold">{value}</b>:{' '}
          {MODE_HINTS[value]}
        </span>
      </p>
    </div>
  )
}
