import { Link } from '@tanstack/react-router'

// Flow, which the parser can't read: left for the bundler
type Props = {| to: string |}

export const Home = (props: Props) => <Link to={props.to} preload="intent" />
