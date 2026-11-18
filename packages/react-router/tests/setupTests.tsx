import { vi } from 'vitest'
import { loadPreloadStrategy } from '@tanstack/router-core'

// @ts-expect-error
global.IS_REACT_ACT_ENVIRONMENT = true

// Mock window.scrollTo to silence errors in tests
window.scrollTo = vi.fn()

// String preload modes load their code on demand, when the first Link that
// uses one mounts. Tests hover right after rendering, before a page would,
// so load it up front. `link-preload-lazy.test.tsx` covers the cold path.
await loadPreloadStrategy('intent')
