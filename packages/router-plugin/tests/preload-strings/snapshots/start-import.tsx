import { createServerFn } from '@tanstack/react-start'
import { intentPreload } from '@tanstack/react-router'
export const getLinks = createServerFn().handler(() => [
  { to: '/', preload: intentPreload() },
])
