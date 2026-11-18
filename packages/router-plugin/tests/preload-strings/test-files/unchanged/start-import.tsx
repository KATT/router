import { createServerFn } from '@tanstack/react-start'

export const getLinks = createServerFn().handler(() => [
  { to: '/', preload: 'intent' },
])
