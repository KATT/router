import {
  Link,
  linkOptions,
  viewportPreload,
  renderPreload,
} from '@tanstack/react-router'
const options = linkOptions({ to: '/', preload: renderPreload() })
export const Nav = () => (
  <>
    <Link {...options} />
    <Link to="/a" preload={viewportPreload()} />
  </>
)
