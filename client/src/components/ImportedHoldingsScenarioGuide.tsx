import {
  IconArrowNarrowDownDashed,
  IconArrowNarrowRightDashed,
} from "@tabler/icons-react";
import { Fragment, type ReactNode } from "react";
import type { AggregatedFidelitySymbolRow } from "../lib/fidelityCsv";
import {
  pickScenarioGuideExampleTickers,
  pickScenarioGuideLeadTickers,
} from "../lib/holdingScenarioGuideExamples";
import { INCOME_RECOMMENDATION_DISCLAIMER } from "../lib/accountIncomeRecommendation";
import "./ImportedHoldingsScenarioGuide.scss";
import { IncomeInflationPercentControl } from "./IncomeGlobalInflationControl";

type Props = {
  holdings: AggregatedFidelitySymbolRow[];
  /** Growth: per-holding scenarios; income: per-account yield assumptions. */
  variant?: "growth" | "income";
  /** When any account uses WITHDRAW or BOTH in income mode. */
  incomeUsesWithdrawalStrategies?: boolean;
  /** Global withdrawal inflation uplift (decimal, e.g. 0.025). */
  inflationAdj?: number;
  onInflationAdjChange?: (value: number) => void;
};

function TickerBadge({ symbol }: { symbol: string }) {
  return (
    <span className="imported-holdings-scenario-guide__ticker">{symbol}</span>
  );
}

function TickerList({ tickers }: { tickers: string[] }) {
  if (tickers.length === 0) return null;

  if (tickers.length === 1) {
    return <TickerBadge symbol={tickers[0]} />;
  }

  if (tickers.length === 2) {
    return (
      <>
        <TickerBadge symbol={tickers[0]} /> and{" "}
        <TickerBadge symbol={tickers[1]} />
      </>
    );
  }

  const head = tickers.slice(0, -1);
  const last = tickers[tickers.length - 1]!;

  return (
    <>
      {head.map((symbol, i) => (
        <Fragment key={symbol}>
          <TickerBadge symbol={symbol} />
          {i < head.length - 1 ? ", " : ", and "}
        </Fragment>
      ))}
      <TickerBadge symbol={last} />
    </>
  );
}

function LeadCopy({ leadTickers }: { leadTickers: string[] }) {
  if (leadTickers.length === 0) {
    return (
      <>
        The global rate above applies to everything. But individual holdings can
        behave differently than a typical index fund. Click Scenario next to any
        holding to set a custom rate, pick a market outlook, or dial in
        year-by-year projections.
      </>
    );
  }

  const verb = leadTickers.length === 1 ? "behaves" : "behave";

  return (
    <>
      The global rate above applies to everything. But{" "}
      <TickerList tickers={leadTickers} /> {verb} differently than a typical
      index fund. Click Scenario next to any holding to set a custom rate, pick
      a market outlook, or dial in year-by-year projections.
    </>
  );
}

function ExamplesLine({ tickers }: { tickers: string[] }) {
  if (tickers.length === 0) return null;

  if (tickers.length === 1) {
    return (
      <p className="imported-holdings-scenario-guide__examples">
        For example: <TickerBadge symbol={tickers[0]} /> might warrant its own
        custom return assumption.
      </p>
    );
  }

  if (tickers.length === 2) {
    return (
      <p className="imported-holdings-scenario-guide__examples">
        For example: <TickerBadge symbol={tickers[0]} /> might warrant a custom
        rate while <TickerBadge symbol={tickers[1]} /> could use a conservative
        market outlook.
      </p>
    );
  }

  return (
    <p className="imported-holdings-scenario-guide__examples">
      For example: <TickerBadge symbol={tickers[0]} /> might warrant a custom
      rate, <TickerBadge symbol={tickers[1]} /> a conservative outlook, and{" "}
      <TickerBadge symbol={tickers[2]} /> a per-year breakdown as you approach
      retirement.
    </p>
  );
}

/** Shown above imported / Plaid holdings when per-ticker scenario editing is available. */
export function ImportedHoldingsScenarioGuide({
  holdings,
  variant = "growth",
  incomeUsesWithdrawalStrategies = false,
  inflationAdj = 0.025,
  onInflationAdjChange,
}: Props) {
  const leadTickers = pickScenarioGuideLeadTickers(holdings);
  const exampleTickers = pickScenarioGuideExampleTickers(holdings);
  if (variant === "growth" && holdings.length === 0) return null;

  if (variant === "income") {
    const allDividend = !incomeUsesWithdrawalStrategies;
    const incomeBullets: ReactNode[] = allDividend
      ? [
          <>
            <strong>Fund choice</strong> — pick a dividend ETF or income stock
            for each account
          </>,
          <>
            <strong>Yield</strong> — estimated distribution rate drives monthly
            income
          </>,
          <>
            <strong>NAV erosion</strong> — some high-yield funds slowly reduce
            principal
          </>,
          <>
            <strong>Pay frequency</strong> — monthly vs quarterly cash flow
            timing
          </>,
        ]
      : [
          <>
            <strong>Dividend fund:</strong> choose a fund and live off the yield
            without ever selling a share. Principal stays intact and keeps
            compounding.
          </>,
          <>
            <strong>Withdraw:</strong> sell shares gradually to generate income.
            Set the rate per account. Higher rates mean more income now but a
            shorter runway.
          </>,
          <>
            <strong>Combine both:</strong> use dividend income as your baseline
            and withdrawals to close any gap. Watch the runway closely when both
            are active.
          </>,
        ];

    return (
      <aside
        className="imported-holdings-scenario-guide imported-holdings-scenario-guide--income"
        aria-label="Account income options"
      >
        <div className="imported-holdings-scenario-guide__layout">
          <div className="imported-holdings-scenario-guide__context">
            <h3 className="imported-holdings-scenario-guide__title">
              {allDividend
                ? "Fine-tune each account's yield assumption"
                : "Fine-tune each account income strategy"}
            </h3>
            <p className="imported-holdings-scenario-guide__lead">
              {allDividend ? (
                "When you retire your portfolio stops accumulating and starts paying you. Each account is modeled as rolled into a dividend fund of your choice. Pick a fund per account below. Yield, NAV drift, and pay frequency all come from that selection."
              ) : (
                <>
                  When you retire your portfolio stops accumulating and starts
                  paying you. How you draw from each account matters. The order,
                  the method, and the rate all affect how much you keep after
                  taxes and how long your money lasts. Some accounts are better
                  suited for dividend income. Others are better drawn down
                  strategically before required distributions force your hand.{" "}
                  <strong>
                    Inflation adjustment{" "}
                    {onInflationAdjChange ? (
                      <IncomeInflationPercentControl
                        wdInflation={inflationAdj}
                        onWdInflation={onInflationAdjChange}
                      />
                    ) : (
                      `${(inflationAdj * 100).toFixed(1)}%`
                    )}{" "}
                    applied globally.
                  </strong>{" "}
                  <em className="imported-holdings-scenario-guide__lead-note">
                    Note: {INCOME_RECOMMENDATION_DISCLAIMER}
                  </em>
                </>
              )}
            </p>
          </div>
          <div className="imported-holdings-scenario-guide__bridge" aria-hidden>
            <span className="imported-holdings-scenario-guide__bridge-icon imported-holdings-scenario-guide__bridge-icon--down">
              <IconArrowNarrowDownDashed size={20} stroke={1.25} />
            </span>
            <span className="imported-holdings-scenario-guide__bridge-icon imported-holdings-scenario-guide__bridge-icon--right">
              <IconArrowNarrowRightDashed size={20} stroke={1.25} />
            </span>
          </div>
          <div className="imported-holdings-scenario-guide__options">
            <ul className="imported-holdings-scenario-guide__list">
              {incomeBullets.map((child, i) => (
                <li key={i}>{child}</li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    );
  }

  const bullets: ReactNode[] = [
    <>
      <strong>Custom rate</strong> — one number, locked in
    </>,
    <>
      <strong>Per year</strong> — year-by-year control until you retire
    </>,
    <>
      <strong>Market outlook</strong> — Bull, Normal, or Bear. Pick your
      reality.
    </>,
  ];

  return (
    <aside
      className="imported-holdings-scenario-guide"
      aria-label="Holding scenario options"
    >
      <div className="imported-holdings-scenario-guide__layout">
        <div className="imported-holdings-scenario-guide__context">
          <h3 className="imported-holdings-scenario-guide__title">
            Fine-tune each holding&apos;s growth assumption
          </h3>
          <p className="imported-holdings-scenario-guide__lead">
            <LeadCopy leadTickers={leadTickers} />
          </p>
        </div>
        <div className="imported-holdings-scenario-guide__bridge" aria-hidden>
          <span className="imported-holdings-scenario-guide__bridge-icon imported-holdings-scenario-guide__bridge-icon--down">
            <IconArrowNarrowDownDashed size={20} stroke={1.25} />
          </span>
          <span className="imported-holdings-scenario-guide__bridge-icon imported-holdings-scenario-guide__bridge-icon--right">
            <IconArrowNarrowRightDashed size={20} stroke={1.25} />
          </span>
        </div>
        <div className="imported-holdings-scenario-guide__options">
          <ul className="imported-holdings-scenario-guide__list">
            {bullets.map((child, i) => (
              <li key={i}>{child}</li>
            ))}
          </ul>
          <ExamplesLine tickers={exampleTickers} />
        </div>
      </div>
    </aside>
  );
}
