import { LegalPageShell } from "../components/LegalPageShell";

const PLAID_PRIVACY_URL = "https://plaid.com/legal/";
const TRUELAYER_PRIVACY_URL = "https://truelayer.com/legal/";

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
          <p className="legal-page__updated">Effective date: May 25, 2026</p>
          <p className="legal-page__updated">Version: 1.1</p>
        </header>

        <hr className="legal-page__rule" aria-hidden />

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Who we are</h2>
          <p className="legal-page__body">
            Expectifi is a retirement planning application operated by
            Expectifi. If you have questions or requests related to this policy,
            contact us at{" "}
            <a className="legal-page__link" href="mailto:support@expectifi.com">
              support@expectifi.com
            </a>
            .
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">What data we collect</h2>
          <p className="legal-page__body">
            When you use Expectifi, we may collect:
          </p>
          <ul className="legal-page__list">
            <li>
              Information you enter directly, including date of birth, income,
              savings balances, retirement goals, and Social Security estimates
            </li>
            <li>
              Financial account data retrieved through Plaid (US users) or
              TrueLayer (UK and European users), including investment holdings,
              account balances, and related account information
            </li>
            <li>
              Profile preferences such as your country of residence, currency
              preference, and retirement destination
            </li>
            <li>Basic usage data such as pages visited and features used</li>
          </ul>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">How we use your data</h2>
          <p className="legal-page__body">
            Your data is used solely to generate retirement projections and
            personalized planning estimates within Expectifi. We do not sell
            your data. We do not use your data for advertising. We do not share
            your data with third parties except as described in this policy.
          </p>
          <p className="legal-page__body">
            <strong>Lawful basis for processing (EU and UK users):</strong> We
            process your personal data on the basis of your explicit consent and
            to perform the retirement planning service you have requested. You
            may withdraw your consent at any time by deleting your account.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Local storage (free accounts)</h2>
          <p className="legal-page__body">
            If you use Expectifi without creating an account, certain
            non-financial profile data — including your country, date of birth,
            income, Social Security estimates, and retirement goals — may be
            stored in your browser&apos;s local storage to avoid requiring you
            to re-enter it on each visit. This data remains on your device and
            is not transmitted to our servers. Account balances and financial
            data are never stored in local storage.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Plaid (US users)</h2>
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
          <h2 className="legal-page__heading">
            TrueLayer (UK and European users)
          </h2>
          <p className="legal-page__body">
            TrueLayer account connection is available on premium accounts only
            for users in the United Kingdom and Europe and is not enabled by
            default. Free accounts do not have access to TrueLayer integration.
            If you choose to connect a financial account through TrueLayer, you
            are subject to TrueLayer&apos;s Privacy Policy at{" "}
            <a
              className="legal-page__link"
              href={TRUELAYER_PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              truelayer.com/legal
            </a>
            . We access only the data necessary to power your retirement
            projections. TrueLayer is a licensed Account Information Service
            Provider regulated under PSD2.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Data storage and security</h2>
          <p className="legal-page__body">
            Your data is hosted on Railway (
            <a
              className="legal-page__link"
              href="https://railway.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              railway.app
            </a>
            ), a cloud infrastructure provider. Data transmitted between your
            device and our servers is encrypted using TLS. Financial account
            tokens are encrypted at rest.
          </p>
          <p className="legal-page__body">
            <strong>International data transfers:</strong> Our servers are
            currently hosted in the United States. If you are located in the
            European Union, United Kingdom, or Canada, your data may be
            transferred to and processed in the United States. Where required,
            we rely on Standard Contractual Clauses approved by the European
            Commission as the legal mechanism for such transfers. By using
            Expectifi and consenting to this policy, you acknowledge this
            transfer.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Your rights</h2>
          <p className="legal-page__body">
            Depending on your location, you may have the following rights
            regarding your personal data:
          </p>
          <ul className="legal-page__list">
            <li>
              <strong>Access:</strong> Request a copy of the data we hold about
              you
            </li>
            <li>
              <strong>Correction:</strong> Request that inaccurate data be
              corrected
            </li>
            <li>
              <strong>Deletion:</strong> Request that your data be permanently
              deleted
            </li>
            <li>
              <strong>Portability:</strong> Request your data in a portable
              format
            </li>
            <li>
              <strong>Objection:</strong> Object to certain types of processing
            </li>
            <li>
              <strong>Withdrawal of consent:</strong> Withdraw your consent at
              any time
            </li>
          </ul>
          <p className="legal-page__body">
            You may delete your account at any time directly within the
            application. Account deletion permanently removes all associated
            data from our systems within 30 days. To submit a data access,
            correction, or portability request, contact us at{" "}
            <a className="legal-page__link" href="mailto:support@expectifi.com">
              support@expectifi.com
            </a>
            . We will respond to all requests within 30 days.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Data retention</h2>
          <p className="legal-page__body">
            We retain your data for as long as your account is active. Upon
            account deletion, your data is removed from our systems within 30
            days. Browser local storage data for free users is retained on your
            device until you clear your browser data or reset your profile
            within the app.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Canadian users (PIPEDA)</h2>
          <p className="legal-page__body">
            If you are located in Canada, we comply with the Personal
            Information Protection and Electronic Documents Act (PIPEDA). You
            have the right to access, correct, and request deletion of your
            personal information. Contact us at{" "}
            <a className="legal-page__link" href="mailto:support@expectifi.com">
              support@expectifi.com
            </a>{" "}
            with any privacy requests.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Cookies and tracking</h2>
          <p className="legal-page__body">
            Expectifi uses minimal tracking. We may use analytics tools to
            understand how features are used in aggregate. We do not use
            advertising cookies or cross-site tracking. You will be notified of
            any cookie use via an in-app notice when you first visit.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">Changes to this policy</h2>
          <p className="legal-page__body">
            We may update this policy as Expectifi evolves. We will notify users
            of material changes via email or an in-app notice at least 14 days
            before the change takes effect. The effective date and version
            number at the top of this page will always reflect the current
            version.
          </p>
        </section>

        <p className="legal-page__body">
          <em>
            Questions? Contact us at{" "}
            <a className="legal-page__link" href="mailto:support@expectifi.com">
              support@expectifi.com
            </a>
          </em>
        </p>
      </article>
    </LegalPageShell>
  );
}
