import './AppPrivacyTrust.scss'

type Props = {
  /** Show a subtle divider above (e.g. below the Where to Retire educational disclaimer). */
  dividerAbove?: boolean
}

export function AppPrivacyTrust({ dividerAbove = false }: Props) {
  return (
    <footer
      className={['app-privacy-trust', dividerAbove && 'app-privacy-trust--divider'].filter(Boolean).join(' ')}
      role="contentinfo"
      aria-label="Privacy commitment"
    >
      <p className="app-privacy-trust__text">
        This is <strong>your data</strong>. We don’t use AI to analyze it, we don’t sell it, and we don’t share it
        with anyone. All projections are educational estimates only and are not financial, tax, or legal advice.
      </p>
    </footer>
  )
}
