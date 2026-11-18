import { Link, createRouter, linkOptions } from '@tanstack/solid-router'
import { routeTree } from './routeTree.gen'

export const router = createRouter({ routeTree, defaultPreload: 'intent' })
export const options = linkOptions({ to: '/', preload: 'render' })
export const Home = () => <Link to="/" preload="viewport" />
