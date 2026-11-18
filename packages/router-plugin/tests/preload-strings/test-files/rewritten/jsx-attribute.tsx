import { Link, createLink } from '@tanstack/react-router'

const CustomLink = createLink((props: React.ComponentProps<'a'>) => (
  <a {...props} />
))

export function Nav() {
  return (
    <nav>
      <Link to="/a" preload="intent">
        A
      </Link>
      <Link to="/b" preload={'viewport'}>
        B
      </Link>
      <Link to="/c" preload={`render`}>
        C
      </Link>
      <Link to="/d" preload={'intent' as const}>
        D
      </Link>
      <Link to="/e" preload={false}>
        E
      </Link>
      <CustomLink to="/f" preload="viewport">
        F
      </CustomLink>
      <video src="/movie.mp4" preload="auto" />
      <audio src="/song.mp3" preload="metadata" />
    </nav>
  )
}
