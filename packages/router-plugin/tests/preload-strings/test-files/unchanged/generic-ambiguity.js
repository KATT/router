import { Link } from '@tanstack/react-router'

// A comparison in JavaScript, a call with a type argument in TypeScript
const a = 1
const b = 2
const c = 3
export const compared = a < b > (c)

export const options = { to: '/', preload: 'intent' }
export const Home = () => <Link to="/" />
