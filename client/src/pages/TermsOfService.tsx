import { APP_PATHS } from "../lib/appPaths";
import { LegalPageShell } from "../components/LegalPageShell";

const PLAID_LEGAL_URL = "https://plaid.com/legal/";

type Props = {
  onSignIn: () => void;
  onCreateAccount: () => void;
  onContactClick: () => void;
};

export default function TermsOfService({
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
          <h1 className="legal-page__title">Terms of Service</h1>
          <p className="legal-page__subtitle">Expectifi</p>
          <p className="legal-page__updated">Last updated: May 23, 2026</p>
        </header>

        <p className="legal-page__intro">
          Please read these Terms of Service carefully before using Expectifi.
          By accessing or using this application, you agree to be bound by
          these terms.
        </p>

        <hr className="legal-page__rule" aria-hidden />

        <section className="legal-page__section">
          <h2 className="legal-page__heading">1. About Expectifi</h2>
          <p className="legal-page__body">
            Expectifi is a retirement planning tool operated by Bryan Chalker,
            an independent developer (&quot;we,&quot; &quot;us,&quot; or
            &quot;our&quot;). The application helps individuals explore
            retirement projections, compare international destinations, and
            visualize financial scenarios based on information they provide.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">
            2. Not Financial, Tax, or Legal Advice
          </h2>
          <p className="legal-page__body">
            <strong>
              This is the most important section of these terms. Please read it
              carefully.
            </strong>
          </p>
          <p className="legal-page__body">
            Expectifi is an educational and planning tool. Nothing in this
            application constitutes:
          </p>
          <ul className="legal-page__list">
            <li>Financial advice or investment recommendations</li>
            <li>Tax advice or guidance on your specific tax situation</li>
            <li>
              Legal advice regarding immigration, residency, or visa matters
            </li>
            <li>Medical advice regarding healthcare in any country</li>
          </ul>
          <p className="legal-page__body">
            All projections, scores, estimates, and calculations are based on
            generalized assumptions and data. They are intended to help you
            explore possibilities and ask better questions — not to replace
            qualified professional guidance.
          </p>
          <p className="legal-page__callout">
            <strong>
              Before making any retirement, relocation, investment, or tax
              decision, consult a licensed financial advisor, certified public
              accountant, immigration attorney, or other qualified professional.
            </strong>
          </p>
          <p className="legal-page__body">
            Tax laws, visa requirements, cost of living, and country-specific
            regulations change frequently. Information displayed in this
            application may be outdated or inaccurate. Always verify current
            conditions through official government sources and qualified
            professionals before acting.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">3. Financial Projections</h2>
          <p className="legal-page__body">
            Retirement projections displayed in Expectifi are estimates only.
            Actual results will differ based on market conditions, inflation,
            personal spending, health events, tax changes, and many other
            factors outside our control or knowledge.
          </p>
          <ul className="legal-page__list">
            <li>Past market performance does not guarantee future results</li>
            <li>
              Return assumptions used in projections are illustrative, not
              predictive
            </li>
            <li>
              Social Security estimates are approximations based on information
              you provide
            </li>
            <li>
              Portfolio values and growth rates are scenarios, not forecasts
            </li>
          </ul>
          <p className="legal-page__body">
            We make no representation that any projection displayed will be
            achieved.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">
            4. International Destination Data
          </h2>
          <p className="legal-page__body">
            Information about international retirement destinations including
            cost of living estimates, tax rates, visa requirements, quality of
            life scores, and expat community data is sourced from third parties
            including Numbeo, World Bank, Pew Research Center, and
            community-sourced reports.
          </p>
          <p className="legal-page__body">This data:</p>
          <ul className="legal-page__list">
            <li>May be outdated, incomplete, or inaccurate</li>
            <li>
              Reflects general country or city averages, not your specific
              circumstances
            </li>
            <li>
              Does not account for individual factors such as lifestyle, health
              needs, or family situation
            </li>
            <li>
              Should not be used as the sole basis for any relocation decision
            </li>
          </ul>
          <p className="legal-page__body">
            Country-specific tax information is for general educational purposes
            only and does not constitute tax advice. Tax residency rules,
            treaty provisions, and filing requirements are complex and vary by
            individual situation. Consult a qualified expat tax professional
            before making any tax-related decisions about international
            relocation.
          </p>
          <p className="legal-page__body">
            Visa and residency information reflects general requirements and may
            not be current. Immigration rules change frequently. Always verify
            current requirements through the official embassy or immigration
            authority of the relevant country.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">
            5. Plaid and Financial Account Connections
          </h2>
          <p className="legal-page__body">
            Expectifi uses Plaid to allow you to optionally connect financial
            accounts. By connecting accounts through Plaid, you also agree to
            Plaid&apos;s End User Privacy Policy available at{" "}
            <a
              className="legal-page__link"
              href={PLAID_LEGAL_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              plaid.com/legal
            </a>
            .
          </p>
          <p className="legal-page__body">When you connect accounts:</p>
          <ul className="legal-page__list">
            <li>
              We access only the data necessary to populate your retirement
              projections
            </li>
            <li>We store access tokens securely to enable ongoing data sync</li>
            <li>We do not sell your financial data to third parties</li>
            <li>You may disconnect accounts at any time</li>
          </ul>
          <p className="legal-page__body">
            Account connection is entirely optional. The application functions
            without connected accounts using manually entered data.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">6. Your Data</h2>
          <p className="legal-page__body">
            You retain ownership of all data you enter into Expectifi. We use
            your data solely to provide the service to you. We do not sell,
            share, or use your data for advertising purposes.
          </p>
          <p className="legal-page__body">
            For full details on how we collect, use, and protect your data, see
            our{" "}
            <a className="legal-page__link" href={APP_PATHS.privacy}>
              Privacy Policy
            </a>
            .
          </p>
          <p className="legal-page__body">
            You may delete your account and all associated data at any time
            from within the application. Deletion is processed within 30 days.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">7. Accuracy and Availability</h2>
          <p className="legal-page__body">
            We make reasonable efforts to maintain the accuracy of information
            in Expectifi but make no warranties, express or implied, regarding:
          </p>
          <ul className="legal-page__list">
            <li>The accuracy, completeness, or timeliness of any data</li>
            <li>The availability or uninterrupted operation of the service</li>
            <li>The suitability of the service for any particular purpose</li>
          </ul>
          <p className="legal-page__body">
            The service is provided &quot;as is&quot; without warranty of any
            kind.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">8. Limitation of Liability</h2>
          <p className="legal-page__body">
            To the maximum extent permitted by applicable law, Expectifi and its
            operator shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of this
            application or reliance on information it contains.
          </p>
          <p className="legal-page__body">
            This includes but is not limited to financial losses, costs of
            professional advice, relocation costs, or any other damages
            resulting from decisions made based on information displayed in
            Expectifi.
          </p>
          <p className="legal-page__body">
            Our total liability to you for any claim arising from use of this
            service shall not exceed the amount you paid us in the twelve months
            preceding the claim.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">9. Acceptable Use</h2>
          <p className="legal-page__body">
            You agree to use Expectifi only for lawful personal retirement
            planning purposes. You agree not to:
          </p>
          <ul className="legal-page__list">
            <li>
              Attempt to reverse engineer, scrape, or extract data from the
              application
            </li>
            <li>Use the service to provide financial advice to third parties</li>
            <li>Share account credentials with others</li>
            <li>Use the service in any way that violates applicable law</li>
          </ul>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">10. Subscription and Billing</h2>
          <p className="legal-page__body">
            Expectifi offers paid subscription tiers. By subscribing:
          </p>
          <ul className="legal-page__list">
            <li>
              You authorize recurring charges to your payment method at the
              stated subscription rate
            </li>
            <li>
              You may cancel at any time and retain access through the end of
              your billing period
            </li>
            <li>
              Refunds are provided at our discretion for unused portions of
              annual subscriptions
            </li>
            <li>
              We reserve the right to change subscription pricing with 30 days
              notice to existing subscribers
            </li>
          </ul>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">11. Changes to These Terms</h2>
          <p className="legal-page__body">
            We may update these terms from time to time. We will notify you of
            material changes via email or an in-app notice at least 14 days
            before changes take effect. Continued use of the service after
            changes take effect constitutes acceptance of the revised terms.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">12. Governing Law</h2>
          <p className="legal-page__body">
            These terms are governed by the laws of the State of Florida, United
            States, without regard to conflict of law principles.
          </p>
        </section>

        <section className="legal-page__section">
          <h2 className="legal-page__heading">13. Contact</h2>
          <p className="legal-page__body">Questions about these terms:</p>
          <div className="legal-page__contact-lines">
            <p>Bryan Chalker</p>
            <p>Middleburg, Florida, United States</p>
          </div>
        </section>

        <p className="legal-page__disclaimer">
          Expectifi is an independent product. It is not affiliated with,
          endorsed by, or connected to any financial institution, government
          agency, or investment platform.
        </p>
      </article>
    </LegalPageShell>
  );
}
