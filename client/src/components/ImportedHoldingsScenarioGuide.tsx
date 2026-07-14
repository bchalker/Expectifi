import type { AggregatedSymbolRow } from "../lib/positionsCsv";
import { pickScenarioGuideLeadTickers } from "../lib/holdingScenarioGuideExamples";
import { INCOME_RECOMMENDATION_DISCLAIMER } from "../lib/accountIncomeRecommendation";
import "./ImportedHoldingsScenarioGuide.scss";
import { IncomeInflationPercentControl } from "./IncomeGlobalInflationControl";

type Props = {
  holdings: AggregatedSymbolRow[];
  /** Growth: per-holding scenarios; income: per-account yield assumptions. */
  variant?: "growth" | "income";
  /** Global withdrawal inflation uplift (decimal, e.g. 0.025). */
  inflationAdj?: number;
  onInflationAdjChange?: (value: number) => void;
};

function TickerSymbol({ symbol }: { symbol: string }) {
  return (
    <strong className="imported-holdings-scenario-guide__ticker">
      {symbol}
    </strong>
  );
}

function GrowthLeadCopy({ dynamicHoldings }: { dynamicHoldings: string[] }) {
  const [holding1, holding2] = dynamicHoldings;

  return (
    <p className="imported-holdings-scenario-guide__lead">
      The global rate applies to everything as a starting point. Click Scenario
      next to any holding to set a custom rate, pick a market outlook, or dial
      in year-by-year projections
      {holding1 && holding2 ? (
        <>
          {" "}
          for positions like <TickerSymbol symbol={holding1} /> and{" "}
          <TickerSymbol symbol={holding2} /> that may behave differently from
          the rest of your portfolio.
        </>
      ) : holding1 ? (
        <>
          {" "}
          for positions like <TickerSymbol symbol={holding1} /> that may behave
          differently from the rest of your portfolio.
        </>
      ) : (
        <>
          {" "}
          for positions that may behave differently from the rest of your
          portfolio.
        </>
      )}
    </p>
  );
}

/** Shown above imported / Plaid holdings when per-ticker scenario editing is available. */
export function ImportedHoldingsScenarioGuide({
  holdings,
  variant = "growth",
  inflationAdj = 0.025,
  onInflationAdjChange,
}: Props) {
  const leadTickers = pickScenarioGuideLeadTickers(holdings);
  const dynamicHoldings = leadTickers.slice(0, 2);

  if (variant === "income") {
    return (
      <aside
        className="imported-holdings-scenario-guide imported-holdings-scenario-guide--income imported-holdings-scenario-guide--income-lead-only"
        aria-label="Account income options"
      >
        <div className="imported-holdings-scenario-guide__context">
          <h3 className="imported-holdings-scenario-guide__title">
            Fine-tune each account income strategy
          </h3>
          <p className="imported-holdings-scenario-guide__lead">
            When you retire your portfolio stops accumulating and starts paying
            you. How you draw from each account matters. The order, the method,
            and the rate all affect how much you keep after taxes and how long
            your money lasts. Some accounts are better suited for dividend
            income. Others are better drawn down strategically before required
            distributions force your hand. At your retirement age, account
            holdings shift to the selected income strategy.{" "}
            <strong>
              Brokerage account transitions may incur capital gains tax not yet
              reflected in this projection.
            </strong>{" "}
            Inflation adjustment{" "}
            {onInflationAdjChange ? (
              <IncomeInflationPercentControl
                wdInflation={inflationAdj}
                onWdInflation={onInflationAdjChange}
              />
            ) : (
              <u>{(inflationAdj * 100).toFixed(1)}%</u>
            )}{" "}
            applied globally.{" "}
            <span className="imported-holdings-scenario-guide__lead-note">
              Note: {INCOME_RECOMMENDATION_DISCLAIMER}
            </span>
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="imported-holdings-scenario-guide imported-holdings-scenario-guide--growth-lead-only"
      aria-label="Holding growth assumptions"
    >
      <div className="imported-holdings-scenario-guide__context">
        <h3 className="imported-holdings-scenario-guide__title">
          Fine-tune each holding&apos;s growth assumption
        </h3>
        <GrowthLeadCopy dynamicHoldings={dynamicHoldings} />
      </div>
    </aside>
  );
}
