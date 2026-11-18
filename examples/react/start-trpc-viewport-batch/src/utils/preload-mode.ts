import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

export const PRELOAD_MODES = ['off', 'render', 'viewport'] as const
export type PreloadMode = (typeof PRELOAD_MODES)[number]

const COOKIE = 'preload-mode'

const parse = (value: string | undefined | null): PreloadMode =>
  PRELOAD_MODES.find((mode) => mode === value) ?? 'viewport'

// Read on the server for SSR and in the browser on hydration, so both render
// the same mode.
export const getPreloadMode = createIsomorphicFn()
  .server(() => parse(getCookie(COOKIE)))
  .client(() =>
    parse(document.cookie.match(/(?:^|; )preload-mode=([^;]*)/)?.[1]),
  )

export function setPreloadMode(mode: PreloadMode) {
  document.cookie = `${COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`
  window.location.reload()
}

/** Turns the demo's mode into router options. */
export function routerPreloadOptions(mode: PreloadMode) {
  return {
    defaultPreload: mode === 'off' ? false : mode,
    defaultPreloadDelay: 100,
  } as const
}
