import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { clearRequestLog } from '~/utils/request-log'
import { PRELOAD_MODES } from '~/utils/preload-mode'
import type { PreloadMode } from '~/utils/preload-mode'

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
    <ToggleGroup
      type="single"
      value={value}
      aria-label="Preload mode"
      onValueChange={(mode) => {
        if (mode && mode !== value) {
          switchTo(mode as PreloadMode)
        }
      }}
    >
      {PRELOAD_MODES.map((mode) => (
        <ToggleGroupItem key={mode} value={mode}>
          {mode}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
