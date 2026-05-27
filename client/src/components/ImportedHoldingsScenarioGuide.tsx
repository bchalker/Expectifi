import {
  IconArrowNarrowDownDashed,
  IconArrowNarrowRightDashed,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { AggregatedFidelitySymbolRow } from "../lib/fidelityCsv";
import { pickScenarioGuideExampleTickers } from "../lib/holdingScenarioGuideExamples";
import "./ImportedHoldingsScenarioGuide.scss";

type Props = {
  holdings: AggregatedFidelitySymbolRow[];
};

function TickerBadge({ symbol }: { symbol: string }) {
  return (
    <span className="imported-holdings-scenario-guide__ticker">{symbol}</span>
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
export function ImportedHoldingsScenarioGuide({ holdings }: Props) {
  const exampleTickers = pickScenarioGuideExampleTickers(holdings);
  if (holdings.length === 0) return null;

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
            Fine-tune each holding's growth assumption
          </h3>
          <p className="imported-holdings-scenario-guide__lead">
            The global rate above applies to everything. But ULTY, YMAX, and MU
            behave differently than a typical index fund. Click Scenario next to
            any holding to set a custom rate, pick a market outlook, or dial in
            year-by-year projections.
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
