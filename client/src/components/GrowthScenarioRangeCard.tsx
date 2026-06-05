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

function WingTrendIcon({ id }: { id: GrowthScenarioRangeRow["id"] }) {
  if (id === "very_bear") {
    return (
      <span
        className="growth-scenario-range-card__trend-icon growth-scenario-range-card__trend-icon--down"
        aria-hidden
      >
        <IconTrendingDown size={16} strokeWidth={1.5} />
      </span>
    );
  }

  if (id === "very_bull") {
    return (
      <span
        className="growth-scenario-range-card__trend-icon growth-scenario-range-card__trend-icon--up"
        aria-hidden
      >
        <IconTrendingUp size={16} strokeWidth={1.5} />
      </span>
    );
  }

  return null;
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

function WingRateRange({ row }: { row: GrowthScenarioRangeRow }) {
  const min = row.rangeMinPct ?? 0;
  const max = row.rangeMaxPct ?? min;
  const singleRate = Math.abs(max - min) < 0.05;

  return (
    <span className="growth-scenario-range-card__range tabular-nums">
      <RatePct pct={min} />
      {!singleRate ? (
        <>
          {" "}
          to <RatePct pct={max} />
        </>
      ) : null}
      /yr
    </span>
  );
}

function WingTile({ row }: { row: GrowthScenarioRangeRow }) {
  return (
    <div className="growth-scenario-range-card__wing-item">
      <div className="growth-scenario-range-card__wing-label-row">
        <span className="growth-scenario-range-card__label">{row.label}</span>
      </div>
      <span className="growth-scenario-range-card__wing-value tabular-nums">
        {fmt(Math.round(row.projectedFv))}
      </span>
      <WingRateRange row={row} />
      {row.deltaFromExpected != null ? (
        <div className="growth-scenario-range-card__wing-delta-row">
          <DeltaAmount delta={row.deltaFromExpected} />
          <WingTrendIcon id={row.id} />
        </div>
      ) : null}
    </div>
  );
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

  const expected = rows.find((row) => row.id === "normal");
  const pessimistic = rows.find((row) => row.id === "very_bear");
  const optimistic = rows.find((row) => row.id === "very_bull");

  return (
    <>
      {expected ? (
        <div className="growth-scenario-range-card__expected">
          <span className="growth-scenario-range-card__label">
            {expected.label}
          </span>
          <span className="growth-scenario-range-card__expected-value tabular-nums">
            {fmt(Math.round(expected.projectedFv))}
          </span>
          {expected.subtext ? (
            <span className="growth-scenario-range-card__subtext">
              {expected.subtext}
            </span>
          ) : null}
        </div>
      ) : null}

      {pessimistic && optimistic ? (
        <div className="growth-scenario-range-card__wings">
          <WingTile row={pessimistic} />
          <WingTile row={optimistic} />
        </div>
      ) : null}
    </>
  );
}
