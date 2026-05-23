import { LegalPageShell } from "../components/LegalPageShell";

const PLAID_PRIVACY_URL = "https://plaid.com/legal/";

type Props = {
  onSignIn: () => void;
  onCreateAccount: () => void;
  onContactClick: () => void;
};

export default function PrivacyPolicy({
  onSignIn,
  onCreateAccount,
  onContactClick,
}: Props) {
  return (
    <LegalPageShell
      onSignIn={onSignIn}
      onCreateAccount={onCreateAccount}
      onContactClick={onContactClick}
    >
      <article className="legal-page__article">
        <header className="legal-page__header">
          <h1 className="legal-page__title">Privacy Policy</h1>
          <p className="legal-page__updated">Last updated: May 19, 2026</p>
        </header>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Who we are</h2>
          <p className="legal-page__body">
            This application is operated by Expectifi.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">What data we collect</h2>
          <p className="legal-page__body">
            When you use this application, we may collect:
          </p>
          <ul className="legal-page__list">
            <li>
              Information you enter directly, including age, income, savings
              balances, and retirement goals
            </li>
            <li>
              Financial account data retrieved through Plaid, including
              investment holdings, account balances, and loan information
            </li>
            <li>Basic usage data such as pages visited and features used</li>
          </ul>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">How we use your data</h2>
          <p className="legal-page__body">
            Your data is used solely to generate retirement projections and
            personalized planning estimates within this application. We do not
            sell your data. We do not use your data for advertising.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Plaid</h2>
          <p className="legal-page__body">
            Plaid account connection is available on premium accounts only and
            is not enabled by default. Free accounts do not have access to Plaid
            integration. If you choose to connect a financial account through
            Plaid, you are subject to Plaid&apos;s Privacy Policy at{" "}
            <a
              className="legal-page__link"
              href={PLAID_PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              plaid.com/legal
            </a>
            . We access only the data necessary to power your retirement
            projections.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Data storage and security</h2>
          <p className="legal-page__body">
            Your data is stored on secured servers. Data transmitted between
            your device and our servers is encrypted using TLS. Financial
            account tokens are encrypted at rest.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Your rights</h2>
          <p className="legal-page__body">
            You may delete your account at any time directly within the
            application. Account deletion permanently removes all associated
            data from our systems within 30 days.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Data retention</h2>
          <p className="legal-page__body">
            We retain your data for as long as your account is active. Upon
            account deletion, your data is removed from our systems within 30
            days.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Changes to this policy</h2>
          <p className="legal-page__body">
            We may update this policy as the application evolves. We will notify
            users of material changes via email or an in-app notice.
          </p>
        </section>
      </article>
    </LegalPageShell>
  );
}
