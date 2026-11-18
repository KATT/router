import { intentPreload } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
export const getLinks = createServerFn().handler(() => [
  { to: '/', preload: intentPreload() },
])
