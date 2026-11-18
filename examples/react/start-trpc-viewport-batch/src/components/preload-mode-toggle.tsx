import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { PRELOAD_MODES, setPreloadMode } from '~/utils/preload-mode'
import type { PreloadMode } from '~/utils/preload-mode'

export function PreloadModeToggle({ value }: { value: PreloadMode }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      aria-label="Preload mode"
      onValueChange={(mode) => {
        if (mode && mode !== value) {
          setPreloadMode(mode as PreloadMode)
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
