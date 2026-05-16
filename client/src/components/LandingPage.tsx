import { IconCircleCheck } from '@tabler/icons-react'
import { Header } from './Header'
import { APP_PATHS } from '../lib/appPaths'
import { landingNavigateOnboarding } from './landingNav'
import './LandingPage.scss'

const HOW_IT_WORKS_STEPS = [
  {
    n: 1,
    title: 'Tell us about you',
    body: 'Your age, target retirement year, and monthly income goal.',
  },
  {
    n: 2,
    title: 'Add your nest egg',
    body: 'Enter your 401k, IRA, Roth, HSA, and brokerage balances.',
  },
  {
    n: 3,
    title: 'See your picture',
    body: 'Get a clear snapshot of your runway, gaps, and Social Security timing.',
  },
] as const

const TRUST_ITEMS = [
  'Your data stays private',
  'No account required to start',
  'Results in under 2 minutes',
] as const

type Props = {
  onSignIn: () => void
  onCreateAccount: () => void
  onGetStarted?: () => void
}

export function LandingPage({
  onSignIn,
  onCreateAccount,
  onGetStarted = landingNavigateOnboarding,
}: Props) {
  const scrollToSection = (id: 'how-it-works' | 'pricing' | 'faq') => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="landing-page">
      <Header
        variant="marketing"
        onSignIn={onSignIn}
        onCreateAccount={onCreateAccount}
        onMarketingAnchor={scrollToSection}
      />


      <main>
        <section className="landing-hero" aria-labelledby="landing-hero-title">
          <div className="landing-page__wrap landing-hero__inner">
            <p className="landing-hero__eyebrow">Retirement planning, simplified</p>
            <h1 id="landing-hero-title" className="landing-hero__title">
              Find out if your <span className="landing-hero__accent">nest egg</span> is ready
            </h1>
            <p className="landing-hero__sub">
              Calculate your retirement income, Social Security timing, and savings runway — clear answers in under 2
              minutes.
            </p>
            <button type="button" className="landing-btn landing-btn--primary landing-btn--lg" onClick={onGetStarted}>
              Get started free
            </button>
            <p className="landing-hero__note">No credit card required · Takes about 2 minutes</p>
          </div>
        </section>

        <section className="landing-trust" aria-label="Trust highlights">
          <div className="landing-page__wrap landing-trust__inner">
            {TRUST_ITEMS.map((label) => (
              <div key={label} className="landing-trust__item">
                <IconCircleCheck className="landing-trust__icon" size={20} stroke={2} aria-hidden />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="landing-steps" aria-labelledby="landing-steps-title">
          <div className="landing-page__wrap landing-steps__inner">
            <p className="landing-section__eyebrow">How it works</p>
            <h2 id="landing-steps-title" className="landing-section__title">
              Three steps to retirement clarity
            </h2>
            <ol className="landing-steps__grid">
              {HOW_IT_WORKS_STEPS.map((step) => (
                <li key={step.n} className="landing-step-card">
                  <span className="landing-step-card__num" aria-hidden>
                    {step.n}
                  </span>
                  <h3 className="landing-step-card__title">{step.title}</h3>
                  <p className="landing-step-card__body">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pricing" className="landing-anchor-section" aria-labelledby="landing-pricing-title">
          <div className="landing-page__wrap">
            <h2 id="landing-pricing-title" className="landing-section__title landing-section__title--sm">
              Pricing
            </h2>
            <p className="landing-anchor-section__body landing-anchor-section__prose">
              Free to start — explore your plan and balances without a credit card. Create an account when you&apos;re
              ready to save your scenario.
            </p>
          </div>
        </section>

        <section id="faq" className="landing-anchor-section landing-anchor-section--alt" aria-labelledby="landing-faq-title">
          <div className="landing-page__wrap">
            <h2 id="landing-faq-title" className="landing-section__title landing-section__title--sm">
              FAQ
            </h2>
            <dl className="landing-faq landing-anchor-section__prose">
              <div>
                <dt>Do I need an account?</dt>
                <dd>No — you can run the calculator and add balances locally before signing up.</dd>
              </div>
              <div>
                <dt>Is my financial data stored?</dt>
                <dd>Your numbers stay in your browser until you create an account and choose to save them.</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="landing-cta" aria-labelledby="landing-cta-title">
          <div className="landing-page__wrap landing-cta__inner">
            <h2 id="landing-cta-title" className="landing-cta__title">
              Ready to see your numbers?
            </h2>
            <p className="landing-cta__sub">Free to start. No spreadsheets. No jargon.</p>
            <button type="button" className="landing-btn landing-btn--primary landing-btn--lg" onClick={onGetStarted}>
              Get started free
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-page__wrap landing-footer__inner">
          <span className="landing-footer__copy">© {new Date().getFullYear()} Eggspectifi</span>
          <nav className="landing-footer__links" aria-label="Legal">
            <a href={APP_PATHS.home}>Privacy</a>
            <a href={APP_PATHS.home}>Terms</a>
            <a href={APP_PATHS.home}>Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

