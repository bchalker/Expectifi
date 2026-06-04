import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { useMemo } from "react";
import type { ComputedSnapshot } from "../lib/computeResults";
import {
  computeGrowthScenarioRangePreview,
  type GrowthScenarioRangePreviewInputs,
  type GrowthScenarioRangeRow,
} from "../lib/growthScenarioRangePreview";
import { formatSignedRatePct } from "../lib/holdingScenarioApply";
import { fmt, fmtK } from "../utils/format";
import "./GrowthScenarioRangeCard.scss";

type Props = {
  c: ComputedSnapshot;
  retRate: number;
  brkRate: number;
  inputs?: GrowthScenarioRangePreviewInputs;
};

function rowDotClass(id: string): string {
  if (id === "very_bear") return "growth-scenario-range-card__dot--very_bear";
  if (id === "very_bull") return "growth-scenario-range-card__dot--very_bull";
  return "growth-scenario-range-card__dot--normal";
}

function formatDeltaAmount(delta: number): string {
  if (!Number.isFinite(delta) || Math.abs(delta) < 500) {
    return "~±0";
  }
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${fmtK(Math.abs(delta))}`;
}

function RatePct({ pct }: { pct: number }) {
  return (
    <span className="growth-scenario-range-card__rate-pct tabular-nums">
      {formatSignedRatePct(pct)}
    </span>
  );
}

function DeltaAmount({ delta }: { delta: number }) {
  const text = formatDeltaAmount(delta);
  let tone: "negative" | "positive" | "neutral" = "neutral";
  if (delta < -500) tone = "negative";
  else if (delta > 500) tone = "positive";

  return (
    <span
      className={[
        "growth-scenario-range-card__delta",
        "tabular-nums",
        tone === "negative" && "growth-scenario-range-card__delta--negative",
        tone === "positive" && "growth-scenario-range-card__delta--positive",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {text}
    </span>
  );
}

function RowDetail({ row }: { row: GrowthScenarioRangeRow }) {
  if (row.id === "normal") {
    return (
      <span className="growth-scenario-range-card__subtext">{row.subtext}</span>
    );
  }

  const min = row.rangeMinPct ?? 0;
  const max = row.rangeMaxPct ?? min;
  const singleRate = Math.abs(max - min) < 0.05;

  return (
    <span className="growth-scenario-range-card__subtext">
      <span className="growth-scenario-range-card__range">
        <RatePct pct={min} />
        {!singleRate ? (
          <>
            {" "}
            to <RatePct pct={max} />
          </>
        ) : null}
      </span>
      <span className="growth-scenario-range-card__range-suffix"> annual</span>
      {row.deltaFromExpected != null ? (
        <>
          <span className="growth-scenario-range-card__sep"> / </span>
          <DeltaAmount delta={row.deltaFromExpected} />
        </>
      ) : null}
    </span>
  );
}

function rowTrendIcon(id: string) {
  if (id === "very_bear") {
    return (
      <IconTrendingDown
        className="growth-scenario-range-card__trend-icon growth-scenario-range-card__trend-icon--bear"
        size={14}
        stroke={1.5}
        aria-hidden
      />
    );
  }
  if (id === "very_bull") {
    return (
      <IconTrendingUp
        className="growth-scenario-range-card__trend-icon growth-scenario-range-card__trend-icon--bull"
        size={14}
        stroke={1.5}
        aria-hidden
      />
    );
  }
  return null;
}

/** Display-only global-tier sensitivity band at the current slider rate. */
export function GrowthScenarioRangeCard({
  c,
  retRate,
  brkRate,
  inputs,
}: Props) {
  const rows = useMemo(
    () => computeGrowthScenarioRangePreview(c, retRate, brkRate, inputs),
    [
      c,
      retRate,
      brkRate,
      inputs?.accountReturnScenarios,
      inputs?.base401k,
      inputs?.baseSE401k,
      inputs?.baseTradIRA,
      inputs?.baseRoth,
      inputs?.baseHsa,
      inputs?.brkBal,
      inputs?.marketScenario,
      inputs?.marketScenarioActive,
    ],
  );

  if (!c.hasPortfolioBalances) return null;

  return (
    <section
      className="growth-scenario-range-card"
      aria-label="Outcome range at current global rate"
    >
      <h4 className="growth-scenario-range-card__heading">
        Outcome range at current rate
      </h4>
      <p className="growth-scenario-range-card__intro">
        Based on global rate only. Account and market scenario settings may shift
        your actual projection.
      </p>
      <ul className="growth-scenario-range-card__list">
        {rows.map((row) => (
          <li key={row.id} className="growth-scenario-range-card__row">
            <div className="growth-scenario-range-card__row-head">
              <span className="growth-scenario-range-card__label-row">
                <span
                  className={[
                    "growth-scenario-range-card__dot",
                    rowDotClass(row.id),
                  ].join(" ")}
                  aria-hidden
                />
                <span className="growth-scenario-range-card__label">
                  {row.label}
                </span>
                {rowTrendIcon(row.id)}
              </span>
              <span className="growth-scenario-range-card__value tabular-nums">
                {fmt(Math.round(row.projectedFv))}
              </span>
            </div>
            <div className="growth-scenario-range-card__row-detail">
              <RowDetail row={row} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
