import { Card } from './card'

// Not a router file: these are some other library's options
export const options = { preload: 'intent', defaultPreload: 'render' }

export function Images() {
  return <Card preload="viewport" />
}
