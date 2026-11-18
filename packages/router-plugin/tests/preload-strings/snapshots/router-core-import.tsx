import { Link } from '@tanstack/react-router'
import { intentPreload as intent } from '@tanstack/router-core'
// Reuses the file's import of the strategy, from either package
export const Nav = () => <Link to="/" preload={intent()} />
export const Fast = () => <Link to="/" preload={intent({ delay: 0 })} />
