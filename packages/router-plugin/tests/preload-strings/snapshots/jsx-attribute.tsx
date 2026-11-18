import {
  intentPreload,
  viewportPreload,
  renderPreload,
} from '@tanstack/react-router'
import { Link, createLink } from '@tanstack/react-router'
const CustomLink = createLink((props: React.ComponentProps<'a'>) => (
  <a {...props} />
))
export function Nav() {
  return (
    <nav>
      <Link to="/a" preload={intentPreload()}>
        A
      </Link>
      <Link to="/b" preload={viewportPreload()}>
        B
      </Link>
      <Link to="/c" preload={renderPreload()}>
        C
      </Link>
      <Link to="/d" preload={intentPreload()}>
        D
      </Link>
      <Link to="/e" preload={false}>
        E
      </Link>
      <CustomLink to="/f" preload={viewportPreload()}>
        F
      </CustomLink>
      <video src="/movie.mp4" preload="auto" />
      <audio src="/song.mp3" preload="metadata" />
    </nav>
  )
}
