import { z } from 'zod'

export const PRELOAD_MODES = [
  'off',
  'render',
  'viewport',
  'viewport-batch',
] as const
export type PreloadMode = (typeof PRELOAD_MODES)[number]

export const DEFAULT_PRELOAD_MODE: PreloadMode = 'viewport-batch'

/**
 * The mode lives in `?preload=`, so a link picks it and the server renders the
 * same mode as the browser. Missing or unknown values fall back to the default.
 */
export const preloadSearchSchema = z.object({
  preload: z
    .enum(PRELOAD_MODES)
    .default(DEFAULT_PRELOAD_MODE)
    .catch(DEFAULT_PRELOAD_MODE),
})

/**
 * What a post link passes as `preload`. `off`, `render` and `viewport` are the
 * router's own modes. `viewport-batch` turns router preloading off and lets
 * `useViewportBatchPreload` do it.
 */
export function linkPreload(mode: PreloadMode) {
  return mode === 'off' || mode === 'viewport-batch' ? false : mode
}
