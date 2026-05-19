import { APP_PATHS, navigateApp } from '../lib/appPaths'
import './PrivacyPolicy.scss'

const PLAID_PRIVACY_URL = 'https://plaid.com/legal/'
const CONTACT_EMAIL = 'bchalker@gmail.com'

export default function PrivacyPolicy() {
  return (
    <div className="privacy-policy">
      <header className="privacy-policy__topbar">
        <div className="privacy-policy__topbar-inner">
          <button type="button" className="privacy-policy__brand" onClick={() => navigateApp(APP_PATHS.home)}>
            HeadwayPlanner
          </button>
        </div>
      </header>

      <main className="privacy-policy__main">
        <article className="privacy-policy__article">
          <header className="privacy-policy__header">
            <h1 className="privacy-policy__title">Privacy Policy</h1>
            <p className="privacy-policy__updated">Last updated: May 19, 2026</p>
          </header>

          <section className="privacy-policy__section">
            <h2 className="privacy-policy__heading">Who we are</h2>
            <p className="privacy-policy__body">
              This application is operated by Bryan Chalker, an independent developer. If you have questions about
              this policy, contact us at{' '}
              <a className="privacy-policy__link" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className="privacy-policy__section">
            <h2 className="privacy-policy__heading">What data we collect</h2>
            <p className="privacy-policy__body">When you use this application, we may collect:</p>
            <ul className="privacy-policy__list">
              <li>
                Information you enter directly, including age, income, savings balances, and retirement goals
              </li>
              <li>
                Financial account data retrieved through Plaid, including investment holdings, account balances, and
                loan information
              </li>
              <li>Basic usage data such as pages visited and features used</li>
            </ul>
          </section>

          <section className="privacy-policy__section">
            <h2 className="privacy-policy__heading">How we use your data</h2>
            <p className="privacy-policy__body">
              Your data is used solely to generate retirement projections and personalized planning estimates within
              this application. We do not sell your data. We do not use your data for advertising.
            </p>
          </section>

          <section className="privacy-policy__section">
            <h2 className="privacy-policy__heading">Plaid</h2>
            <p className="privacy-policy__body">
              This application uses Plaid to connect to your financial accounts. When you choose to connect an account,
              you are subject to Plaid&apos;s Privacy Policy at{' '}
              <a className="privacy-policy__link" href={PLAID_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
                plaid.com/legal
              </a>
              . We access only the data necessary to power your retirement projections.
            </p>
          </section>

          <section className="privacy-policy__section">
            <h2 className="privacy-policy__heading">Data storage and security</h2>
            <p className="privacy-policy__body">
              Your data is stored on secured servers. Data transmitted between your device and our servers is
              encrypted using TLS. Financial account tokens are encrypted at rest.
            </p>
          </section>

          <section className="privacy-policy__section">
            <h2 className="privacy-policy__heading">Your rights</h2>
            <p className="privacy-policy__body">
              You may request deletion of your account and associated data at any time by contacting{' '}
              <a className="privacy-policy__link" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              . We will process deletion requests within 30 days.
            </p>
          </section>

          <section className="privacy-policy__section">
            <h2 className="privacy-policy__heading">Data retention</h2>
            <p className="privacy-policy__body">
              We retain your data for as long as your account is active. Upon account deletion, your data is removed
              from our systems within 30 days.
            </p>
          </section>

          <section className="privacy-policy__section">
            <h2 className="privacy-policy__heading">Changes to this policy</h2>
            <p className="privacy-policy__body">
              We may update this policy as the application evolves. We will notify users of material changes via email
              or an in-app notice.
            </p>
          </section>
        </article>
      </main>

      <footer className="privacy-policy__footer">
        <div className="privacy-policy__footer-inner">
          <button type="button" className="privacy-policy__back" onClick={() => navigateApp(APP_PATHS.home)}>
            Back to home
          </button>
        </div>
      </footer>
    </div>
  )
}
