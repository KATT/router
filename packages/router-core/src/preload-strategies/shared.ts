import type { AnyRouter } from '../router'
import type {
  LinkPreloader,
  PreloadHandlers,
  PreloadLink,
  PreloadStrategy,
} from './types'

/**
 * A link's preload delay: its own `preloadDelay`, else the strategy's
 * `delay`, else the router's `defaultPreloadDelay`.
 */
export const delayOf = (router: AnyRouter, link: PreloadLink, delay?: number) =>
  link.delay ?? delay ?? router.options.defaultPreloadDelay ?? 0

// The element events each handler answers to, as the Link's own handlers do
// for the string modes. They're listened to here, so Links pay nothing for
// strategies unless one is imported.
const handlerFor = {
  mouseenter: 'enter',
  focusin: 'enter',
  mouseleave: 'leave',
  focusout: 'leave',
  touchstart: 'touch',
  click: 'cancel',
} as const satisfies Record<string, keyof PreloadHandlers>

/**
 * Makes a strategy factory, `factory(options)(router)(link)`.
 *
 * - The same options give the same strategy, so one called inline on every
 *   render still gives Links the same strategy: they don't restart it.
 * - It's started once per router, with the options it was called with. State
 *   its links share lives there.
 * - What it returns runs for each Link on the client. The handlers it gives
 *   back listen to the link's element.
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function createPreloadStrategy<TOptions extends object = object>(
  start: (options: TOptions, router: AnyRouter) => LinkPreloader,
) {
  const made = new Map<string, PreloadStrategy>()
  return (options = {} as TOptions): PreloadStrategy => {
    const key = JSON.stringify(options, Object.keys(options).sort())
    let strategy = made.get(key)
    if (!strategy) {
      const started = new WeakMap<AnyRouter, LinkPreloader>()
      strategy = (router, ref, preload, delay) => {
        let forLinks = started.get(router)
        if (!forLinks) {
          started.set(router, (forLinks = start(options, router)))
        }
        const element = ref.current
        const handlers = forLinks({ element, key: ref, delay, preload })
        if (!handlers) {
          return
        }
        const listen = (event: Event) =>
          handlers[handlerFor[event.type as keyof typeof handlerFor]]?.()
        for (const type in handlerFor) {
          element?.addEventListener(type, listen, { passive: true })
        }
        return () => {
          for (const type in handlerFor) {
            element?.removeEventListener(type, listen)
          }
          handlers.cleanup?.()
        }
      }
      made.set(key, strategy)
    }
    return strategy
  }
}
