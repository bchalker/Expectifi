import type { AccountScenarioBucketId } from "./accountReturnScenario";
import {
  DEFAULT_MARKET_SCENARIO_ID,
  effectiveMarketScenarioId,
  getMarketScenarioDefinition,
  isMarketScenarioApplied,
  resolveGlobalMarketScenarioRates,
  type MarketScenarioId,
} from "./marketScenario";
import type { GrowthScenarioRangePreviewInputs } from "./growthScenarioRangePreview";
import { anchoredOutlookScenarioRateRangePcts } from "./scenarioRates";

export type GrowthAccountScenario = "bear" | "base" | "bull";

export const ACCOUNT_GROWTH_COLORS: Record<AccountScenarioBucketId, string> = {
  brokerage: "#e07b1a",
  pretax: "#27ae60",
  roth: "#3498db",
  hsa: "#9b59b6",
};

export type GrowthBarSegment = {
  age: number;
  value: number;
  increment: number;
  flexGrow: number;
  opacity: number;
  tip: string;
};

export type AccountGrowthBarData = {
  segments: GrowthBarSegment[];
  startAge: number;
  retirementAge: number;
  startBalance: number;
  projectedFinal: number;
  color: string;
};

function effectiveGlobalBaseRate(
  sliderRate: number,
  marketScenario: MarketScenarioId,
  horizon: number,
): number {
  const def = getMarketScenarioDefinition(marketScenario);
  if (def.kind === "flat_modifier") {
    return sliderRate + (def.flatModifier ?? 0);
  }
  const rates = resolveGlobalMarketScenarioRates(
    marketScenario,
    sliderRate,
    horizon,
  );
  if (rates.length === 0) return sliderRate;
  return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}

export function formatGrowthBarValue(v: number): string {
  const rounded = Math.round(v);
  if (rounded >= 1_000_000) {
    return `$${(rounded / 1_000_000).toFixed(1)}M`;
  }
  if (rounded >= 1_000) {
    return `$${Math.round(rounded / 1_000)}K`;
  }
  return `$${rounded}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function accountGrowthScenarioRate(
  scenario: GrowthAccountScenario,
  bucket: AccountScenarioBucketId,
  retRate: number,
  brkRate: number,
  yearsToRetirement: number,
  inputs?: GrowthScenarioRangePreviewInputs,
): number {
  const horizon = Math.max(1, Math.round(yearsToRetirement));
  const sliderRate = bucket === "brokerage" ? brkRate : retRate;
  const marketApplied = inputs ? isMarketScenarioApplied(inputs) : false;
  const marketScenarioId = inputs
    ? effectiveMarketScenarioId(inputs)
    : DEFAULT_MARKET_SCENARIO_ID;
  const wingBaseRate = marketApplied
    ? effectiveGlobalBaseRate(sliderRate, marketScenarioId, horizon)
    : sliderRate;

  if (scenario === "base") return sliderRate;
  if (scenario === "bear") {
    return (
      anchoredOutlookScenarioRateRangePcts("very_bear", wingBaseRate, horizon)
        .min / 100
    );
  }
  return (
    anchoredOutlookScenarioRateRangePcts("very_bull", wingBaseRate, horizon)
      .max / 100
  );
}

export function buildAccountGrowthBarData(
  startingBalance: number,
  annualRate: number,
  yearsToRetirement: number,
  startAge: number,
  color: string,
): AccountGrowthBarData | null {
  if (!(startingBalance > 0) || yearsToRetirement < 0) return null;

  const values: number[] = [];
  for (let year = 0; year <= yearsToRetirement; year++) {
    values.push(startingBalance * (1 + annualRate) ** year);
  }

  const increments = values.map((value, index) =>
    index === 0 ? startingBalance : value - (values[index - 1] ?? 0),
  );
  const totalIncrement = increments.reduce((sum, value) => sum + value, 0);
  if (totalIncrement <= 0) return null;

  const segmentCount = increments.length;
  const segments: GrowthBarSegment[] = increments.map((increment, index) => {
    const age = startAge + index;
    const value = values[index] ?? startingBalance;
    return {
      age,
      value,
      increment,
      flexGrow: (increment / totalIncrement) * 100,
      opacity:
        segmentCount <= 1 ? 1 : 0.25 + (index / (segmentCount - 1)) * 0.75,
      tip: `Age ${age}: ${formatGrowthBarValue(value)}`,
    };
  });

  return {
    segments,
    startAge,
    retirementAge: startAge + yearsToRetirement,
    startBalance: startingBalance,
    projectedFinal: values[values.length - 1] ?? startingBalance,
    color,
  };
}
