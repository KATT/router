import * as Router from '@tanstack/react-router'
import * as motion from './motion'

// Member and namespaced names are left alone, even the router's own
export const Media = () => (
  <>
    <motion.video src="/movie.mp4" preload="intent" />
    <svg:x preload="render" />
    <Router.Link to="/" preload="viewport" />
  </>
)
