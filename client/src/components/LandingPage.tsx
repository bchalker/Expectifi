import { useRef, type CSSProperties } from "react";
import {
  IconChartLine,
  IconCircleCheck,
  IconInfoCircle,
  IconWorld,
} from "@tabler/icons-react";
import { Header } from "./Header";
import { LandingFooter } from "./LandingFooter";
import { LandingHeroDivider } from "./LandingHeroDivider";
import { LandingHeroHeadline } from "./LandingHeroHeadline";
import { useLandingFaqPhoneScroll } from "../hooks/useLandingFaqPhoneScroll";
import { landingNavigateOnboarding } from "./landingNav";
import "./LandingPage.scss";

const FEATURE_CARDS = [
  {
    id: "portfolio",
    icon: IconChartLine,
    title: "Your retirement portfolio, mapped out",
    subheading:
      "Add your accounts in 60 seconds. See what they are worth when you retire.",
    imageSrc: "/screenshots/growth-mode-preview.png",
    imageAlt:
      "Expectifi growth projection showing portfolio at retirement, account balances, and return scenario controls.",
    body: `Set growth scenarios per holding, model life events that pull from your portfolio before retirement, and see your projected balance at your target retirement age.

The income phase shows what you can draw each month by dividend fund per account, withdrawal rate, or a combination of both. Each account gets its own strategy based on how it is taxed and how long you want it to last. Tax breakdown, runway projections, and withdrawal order guidance are built in.`,
  },
  {
    id: "where-to-retire",
    icon: IconWorld,
    title: "Find where your income goes furthest",
    subheading:
      "870 cities. 135 countries. Ranked by your real surplus after taxes.",
    imageSrc: "/screenshots/wtr-preview.png",
    imageAlt:
      "Where to retire map with city list sorted by expat community size, region filters, and an interactive world map.",
    body: `Most retirement calculators stop at your savings. Expectifi goes further, comparing cost of living, local tax rates on foreign pension income, food prices, healthcare, climate, and air quality so you can see which destinations actually work on your budget.

Your projected retirement income connects directly to the map. As you configure your accounts the cities update in real time showing exactly where your money goes furthest.`,
  },
] as const;

const TRUST_ITEMS = [
  "United States & Canada",
  "Your data stays private",
  "No account required",
  "Results in under 2 minutes",
] as const;

const PRICING_FREE_FEATURES = [
  "Manual account entry",
  "CSV import (Fidelity, Vanguard, Schwab)",
  "Growth and income projections",
  "Per-account income strategy",
  "Withdrawal strategy",
  "Tax breakdown at retirement",
  "Runway projections per account",
  "Where to Retire map with 870 cities",
  "Social Security timing",
] as const;

const PRICING_PREMIUM_FEATURES = [
  "Everything in free",
  "Saved scenarios you can revisit anytime",
  "Settings and balances saved across visits",
  "Plaid bank sync (w/ applicable institutions)",
  "All future features as we ship them",
] as const;

const FAQ_ITEMS = [
  {
    q: "Do I need an account?",
    a: "No. You can run the calculator and add balances locally before signing up.",
  },
  {
    q: "Is my financial data stored?",
    a: "Your numbers stay in your browser until you create an account and choose to save them.",
  },
  {
    q: "How do I add my accounts?",
    a: "You can enter balances manually, import a CSV from Fidelity, Vanguard, or Schwab, or connect via Plaid for most other institutions (US and Canada). Note: Fidelity accounts are not supported by Plaid, but you can use CSV import or manual entry for Fidelity. Manual is only for bucket amount, while csv will pull in your holdings and balances.",
  },
  {
    q: "What's the difference between the growth and income phases?",
    a: "The growth phase shows your portfolio compounding from today until your retirement date based on the return assumptions you choose. The income phase shows what you can draw each month after retirement using a per-account strategy: dividend income from a fund of your choice, a withdrawal rate, or both combined. Tax and withdrawal guidance follows US or Canadian rules based on your country.",
  },
  {
    q: "Does the retirement map account for taxes?",
    a: "Yes. Each destination calculates your estimated net income after local taxes on foreign pension income, compares it against real cost of living data, and scores it on quality of life, food prices, healthcare, climate, and air quality. The surplus figure shown is what you would actually have left each month, not just raw cost of living.",
  },
  {
    q: "How does the income phase work?",
    a: "Each retirement account can use a different income strategy. Choose a dividend fund and live off the yield without selling shares, set a withdrawal rate to draw down principal over time, or combine both. The app shows your monthly income per account, estimated runway, and tax treatment side by side so you can optimize before you retire.",
  },
] as const;

type Props = {
  onSignIn: () => void;
  onCreateAccount: () => void;
  onGetStarted?: () => void;
  onContactClick: () => void;
};

export function LandingPage({
  onSignIn,
  onCreateAccount,
  onGetStarted = landingNavigateOnboarding,
  onContactClick,
}: Props) {
  const faqSectionRef = useRef<HTMLElement>(null);
  const faqDeviceRef = useRef<HTMLElement>(null);
  const faqPhoneProgress = useLandingFaqPhoneScroll(faqSectionRef);
  const faqPhoneStyle = {
    "--landing-phone-progress": faqPhoneProgress,
  } as CSSProperties;

  const scrollToSection = (id: "how-it-works" | "pricing" | "faq") => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
          <div className="landing-page__wrap">
            <div className="landing-hero__inner">
              <LandingHeroHeadline />
              <button
                type="button"
                className="landing-btn landing-btn--primary landing-btn--lg"
                onClick={onGetStarted}
              >
                Get started free
              </button>
              <p className="landing-hero__note">No credit card required</p>
            </div>
          </div>
        </section>

        <section className="landing-trust" aria-label="Trust highlights">
          <div className="landing-page__wrap landing-trust__inner">
            {TRUST_ITEMS.map((label) => (
              <div key={label} className="landing-trust__item">
                <IconCircleCheck
                  className="landing-trust__icon"
                  size={20}
                  stroke={2}
                  aria-hidden
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <LandingHeroDivider />
        </section>

        <section
          id="how-it-works"
          className="landing-steps"
          aria-labelledby="landing-steps-title"
        >
          <div className="landing-page__wrap landing-steps__inner">
            <p className="landing-section__eyebrow">How it works</p>
            <h2 id="landing-steps-title" className="landing-section__title">
              Two tools. One retirement picture.
            </h2>
            <p className="landing-section__tagline">
              Every nest egg looks different.
            </p>
            <div className="landing-feature-cards">
              {FEATURE_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.id} className="landing-feature-card">
                    <Icon
                      className="landing-feature-card__icon"
                      size={24}
                      stroke={1.5}
                      aria-hidden
                    />
                    <h3 className="landing-feature-card__title">
                      {card.title}
                    </h3>
                    <p className="landing-feature-card__subheading">
                      {card.subheading}
                    </p>
                    <div
                      className="landing-feature-card__media"
                      role="img"
                      aria-label={card.imageAlt}
                      style={{ backgroundImage: `url("${card.imageSrc}")` }}
                    />
                    <p className="landing-feature-card__body">{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="landing-pricing"
          aria-labelledby="landing-pricing-title"
        >
          <div className="landing-page__wrap landing-pricing__inner">
            <header className="landing-pricing__header">
              <p className="landing-section__eyebrow">Pricing</p>
              <h2
                id="landing-pricing-title"
                className="landing-section__title landing-pricing__title"
              >
                100% free to use. No account required.
              </h2>
              <p className="landing-pricing__intro">
                Explore your retirement plan without signing up. Upgrade only
                when you want to save your work and sync your accounts.
              </p>
            </header>

            <div className="landing-pricing__grid">
              <article className="landing-pricing-plan landing-pricing-plan--free">
                <h3 className="landing-pricing-plan__name">Free</h3>
                <p className="landing-pricing-plan__price">
                  <span className="landing-pricing-plan__price-amount">$0</span>
                  <span className="landing-pricing-plan__price-period">
                    forever
                  </span>
                </p>
                <ul className="landing-pricing-plan__list">
                  {PRICING_FREE_FEATURES.map((item) => (
                    <li key={item} className="landing-pricing-plan__list-item">
                      <IconCircleCheck
                        className="landing-pricing-plan__check"
                        size={18}
                        stroke={2}
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="landing-pricing-plan__footnote">
                  <IconInfoCircle
                    className="landing-pricing-plan__footnote-icon"
                    size={16}
                    stroke={1.5}
                    aria-hidden
                  />
                  <span>
                    Your data lives in this browser session. Nothing is saved
                    between visits.
                  </span>
                </p>
              </article>

              <article className="landing-pricing-plan landing-pricing-plan--premium">
                <div className="landing-pricing-plan__head">
                  <h3 className="landing-pricing-plan__name">Premium</h3>
                  <span className="landing-pricing-plan__badge">Upgrade</span>
                </div>
                <p className="landing-pricing-plan__price landing-pricing-plan__price--premium">
                  <span className="landing-pricing-plan__price-amount">$9</span>
                  <span className="landing-pricing-plan__price-period">
                    / month
                  </span>
                </p>
                <ul className="landing-pricing-plan__list">
                  {PRICING_PREMIUM_FEATURES.map((item) => (
                    <li key={item} className="landing-pricing-plan__list-item">
                      <IconCircleCheck
                        className="landing-pricing-plan__check"
                        size={18}
                        stroke={2}
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="landing-pricing-plan__footnote">
                  <IconInfoCircle
                    className="landing-pricing-plan__footnote-icon"
                    size={16}
                    stroke={1.5}
                    aria-hidden
                  />
                  <span>Cancel anytime. No questions asked.</span>
                </p>
              </article>
            </div>

            <div className="landing-pricing__cta-block">
              <button
                type="button"
                className="landing-btn landing-btn--primary landing-btn--lg landing-pricing__cta"
                onClick={onGetStarted}
              >
                Start for free. No account needed
              </button>
              <p className="landing-pricing__cta-note">
                No credit card. No signup. Just open and explore.
              </p>
            </div>
          </div>
        </section>

        <section
          ref={faqSectionRef}
          id="faq"
          className="landing-anchor-section landing-anchor-section--alt landing-faq-section"
          aria-labelledby="landing-faq-title"
        >
          <div className="landing-page__wrap landing-faq-section__wrap">
            <div className="landing-faq-section__layout">
              <figure
                ref={faqDeviceRef}
                className="landing-faq-section__device"
                style={faqPhoneStyle}
              >
                <div className="landing-phone-frame">
                  <div className="landing-phone-frame__shell">
                    <div className="landing-phone-frame__island" aria-hidden />
                    <img
                      className="landing-phone-frame__screen"
                      src="/screenshots/growth-mode-mobile-preview.png"
                      alt="Expectifi mobile app showing growth projection, return slider, and retirement account balances."
                      width={390}
                      height={844}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
              </figure>
              <div className="landing-faq-section__content">
                <h2
                  id="landing-faq-title"
                  className="landing-section__title landing-section__title--sm"
                >
                  FAQ
                </h2>
                <dl className="landing-faq">
                  {FAQ_ITEMS.map((item) => (
                    <div key={item.q}>
                      <dt>{item.q}</dt>
                      <dd>{item.a}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-cta" aria-labelledby="landing-cta-title">
          <div className="landing-page__wrap landing-cta__inner">
            <h2 id="landing-cta-title" className="landing-cta__title">
              Ready to see your numbers?
            </h2>
            <p className="landing-cta__sub">
              Free to start. No spreadsheets. No jargon.
            </p>
            <button
              type="button"
              className="landing-btn landing-btn--primary landing-btn--lg"
              onClick={onGetStarted}
            >
              Get started free
            </button>
          </div>
        </section>
      </main>

      <LandingFooter onContactClick={onContactClick} />
    </div>
  );
}
