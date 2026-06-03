import "./ImportedHoldingsScenarioGuide.scss";

/** Scenario education copy for the Expectifinsights Scenario Guide tab (growth mode). */
export function HoldingScenarioGuidePanel() {
  return (
    <div
      className="holding-scenario-guide-panel"
      aria-label="Scenario guide"
    >
      <h4 className="imported-holdings-scenario-guide__options-heading">
        What is a scenario?
      </h4>
      <div className="imported-holdings-scenario-guide__options-body">
        <p>
          A scenario is your growth assumption for a single holding. It overrides
          the global rate for that position only and lets you model what you
          actually believe about it.
        </p>
        <p>
          <span className="imported-holdings-scenario-guide__term">
            Custom rate
          </span>{" "}
          works best for holdings where you have a specific return in mind and
          want to lock it in regardless of market conditions.
        </p>
        <p>
          <span className="imported-holdings-scenario-guide__term">Per year</span>{" "}
          lets you map out returns year by year. Useful when you expect a holding
          to behave differently in early years versus later ones.
        </p>
        <p>
          <span className="imported-holdings-scenario-guide__term">
            Market outlook
          </span>{" "}
          applies a Bull, Normal, or Bear assumption. The model adjusts projected
          growth based on what each scenario historically implies for that type
          of holding.
        </p>
        <p className="imported-holdings-scenario-guide__options-aside">
          Not sure where to start? Set your highest conviction positions first
          and leave the rest on the global rate.
        </p>
      </div>
    </div>
  );
}
