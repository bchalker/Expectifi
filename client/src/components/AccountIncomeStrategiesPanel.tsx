import "./ImportedHoldingsScenarioGuide.scss";

/** Strategy options copy for the Expectifinsights Strategies tab (income mode). */
export function AccountIncomeStrategiesPanel() {
  return (
    <div
      className="account-income-strategies-panel"
      aria-label="Income strategies"
    >
      <ul className="imported-holdings-scenario-guide__list">
        <li>
          <strong>Dividend fund:</strong> choose a fund and live off the yield
          without ever selling a share. Principal stays intact and keeps
          compounding.
        </li>
        <li>
          <strong>Withdraw:</strong> sell shares gradually to generate income.
          Set the rate per account. Higher rates mean more income now but a
          shorter runway.
        </li>
        <li>
          <strong>Combine both:</strong> use dividend income as your baseline
          and withdrawals to close any gap. Watch the runway closely when both
          are active.
        </li>
      </ul>
    </div>
  );
}
