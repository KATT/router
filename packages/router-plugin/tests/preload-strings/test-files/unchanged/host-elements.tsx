import { Link } from '@tanstack/react-router'

export function Media() {
  return (
    <>
      <video src="/movie.mp4" preload="auto" />
      <audio src="/song.mp3" preload="none" />
      <video src="/clip.mp4" preload={'metadata'} />
      <Link to="/a" preload={false} />
      <Link to="/b" title="intent" />
    </>
  )
}

export function preloadIntent({ preload = 'intent' }: { preload?: string }) {
  return preload
}
