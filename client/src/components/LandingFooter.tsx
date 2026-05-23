import { APP_PATHS } from '../lib/appPaths'

type Props = {
  onContactClick: () => void
}

export function LandingFooter({ onContactClick }: Props) {
  return (
    <footer className="landing-footer">
      <div className="landing-page__wrap landing-footer__inner">
        <span className="landing-footer__copy">© {new Date().getFullYear()} Expectifi</span>
        <nav className="landing-footer__links" aria-label="Legal">
          <a href={APP_PATHS.privacy}>Privacy</a>
          <a href={APP_PATHS.terms}>Terms</a>
          <button type="button" className="landing-footer__contact" onClick={onContactClick}>
            Contact
          </button>
        </nav>
      </div>
    </footer>
  )
}
