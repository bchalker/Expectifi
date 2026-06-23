import { fv, fvAnnuity } from "shared";
import type { CalculatorInputs, ComputedSnapshot } from "./computeResults";
import {
  accountScenarioBucketForPositionId,
  currentBalanceForScenarioBucket,
  holdingReturnRateSource,
  mergedModelsForAccountBucket,
  type AccountScenarioBucketId,
} from "./accountReturnScenario";
import {
  type OutlookScenarioChoice,
} from "./holdingScenarioApply";
import {
  anchoredOutlookScenarioRateRangePcts,
  globalRelativeScenarioRates,
} from "./scenarioRates";
import {
  effectiveMarketScenarioId,
  fvAnnuityWithYearlyRates,
  getMarketScenarioDefinition,
  isMarketScenarioApplied,
  resolveGlobalMarketScenarioRates,
  type MarketScenarioId,
} from "./marketScenario";
import {
  calcPositionFV,
  positionUsesCustomReturnMode,
} from "./positionReturnModel";

export type GrowthScenarioRangeRowId = "very_bear" | "normal" | "very_bull";

export type GrowthScenarioRangePreviewInputs = Pick<
  CalculatorInputs,
  | "accountReturnScenarios"
  | "base401k"
  | "baseSE401k"
  | "baseTradIRA"
  | "baseRoth"
  | "baseHsa"
  | "brkBal"
  | "marketScenario"
  | "marketScenarioActive"
>;

function bucketHasAccountScenario(
  inputs: GrowthScenarioRangePreviewInputs,
  bucket: AccountScenarioBucketId,
): boolean {
  return inputs.accountReturnScenarios?.[bucket] != null;
}

export type GrowthScenarioRangeRow = {
  id: GrowthScenarioRangeRowId;
  label: string;
  /** Expected row only. */
  subtext?: string;
  /** Wing rows — card-relative annual return span (%). */
  rangeMinPct?: number;
  rangeMaxPct?: number;
  projectedFv: number;
  /** Wing rows only — difference from Expected at flat global rate. */
  deltaFromExpected?: number;
};

function horizonClamp(y: number): number {
  return Math.max(1, Math.min(50, Math.round(y)));
}

/** Flat base rate for card preview when a macro scenario is active (slider + modifier). */
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

function expectedSubtext(
  sliderRetRate: number,
  baseRetRate: number,
  marketApplied: boolean,
  scenarioLabel: string,
): string {
  const sliderPct = (sliderRetRate * 100).toFixed(1);
  if (marketApplied) {
    const effectivePct = (baseRetRate * 100).toFixed(1);
    return `at ${effectivePct}% effective (${sliderPct}% + ${scenarioLabel})`;
  }
  return `at ${sliderPct}% global rate`;
}

function savingsScenarioDelta(
  save: number,
  retRate: number,
  choice: OutlookScenarioChoice,
  horizon: number,
): number {
  if (!(save > 0)) return 0;
  const h = horizonClamp(horizon);
  const baseline = fvAnnuity(save, retRate, h);
  const rates = globalRelativeScenarioRates(choice, retRate, h);
  return fvAnnuityWithYearlyRates(save, rates) - baseline;
}

function lumpOutlookDelta(
  principal: number,
  globalBlended: number,
  choice: OutlookScenarioChoice,
  horizon: number,
): number {
  if (!(principal > 0)) return 0;
  const h = horizonClamp(horizon);
  const baselineRates = Array.from({ length: h }, () => globalBlended);
  const scenarioRates = globalRelativeScenarioRates(choice, globalBlended, h);
  return (
    calcPositionFV(principal, scenarioRates) -
    calcPositionFV(principal, baselineRates)
  );
}

/**
 * Balances that follow the global slider tier only — excludes custom holdings,
 * account-level scenarios, and macro (computed separately from live totalFV).
 */
function globalTierAdjustablePrincipal(
  c: ComputedSnapshot,
  retRate: number,
  brkRate: number,
  inputs?: GrowthScenarioRangePreviewInputs,
): { retPrincipal: number; brkPrincipal: number } {
  let retExcluded = 0;
  let brkExcluded = 0;
  const accountScenarios = inputs?.accountReturnScenarios;
  const allMerged = [
    ...c.mergedRetirementPositionModels,
    ...c.mergedBrokeragePositionModels,
  ];

  for (const m of c.mergedRetirementPositionModels) {
    const bucket = accountScenarioBucketForPositionId(m.id);
    const accountScenario =
      bucket && accountScenarios ? accountScenarios[bucket] : undefined;
    if (
      positionUsesCustomReturnMode(m, retRate) ||
      holdingReturnRateSource(m, accountScenario, retRate) !== "global"
    ) {
      retExcluded += m.currentValue;
    }
  }

  for (const m of c.mergedBrokeragePositionModels) {
    const accountScenario = accountScenarios?.brokerage;
    if (
      positionUsesCustomReturnMode(m, brkRate) ||
      holdingReturnRateSource(m, accountScenario, brkRate) !== "global"
    ) {
      brkExcluded += m.currentValue;
    }
  }

  if (inputs && accountScenarios) {
    const manualBuckets: AccountScenarioBucketId[] = [
      "pretax",
      "roth",
      "hsa",
      "brokerage",
    ];
    for (const bucket of manualBuckets) {
      if (!bucketHasAccountScenario(inputs, bucket)) continue;
      if (mergedModelsForAccountBucket(bucket, allMerged).length > 0) continue;
      const bal = currentBalanceForScenarioBucket(
        bucket,
        inputs as CalculatorInputs,
      );
      if (!(bal > 0)) continue;
      if (bucket === "brokerage") brkExcluded += bal;
      else retExcluded += bal;
    }
  }

  return {
    retPrincipal: Math.max(0, c.retBal - retExcluded),
    brkPrincipal: Math.max(0, c.brkBal - brkExcluded),
  };
}

/** Flat global-slider FV for the global-tier slice (same baseline the wings use). */
function globalTierExpectedFv(
  retPrincipal: number,
  brkPrincipal: number,
  save: number,
  fvRetRate: number,
  fvBrkRate: number,
  horizon: number,
): number {
  const h = horizonClamp(horizon);
  const savingsFv = save > 0 ? fvAnnuity(save, fvRetRate, h) : 0;
  const retFv = retPrincipal > 0 ? fv(retPrincipal, fvRetRate, h) : 0;
  const brkFv = brkPrincipal > 0 ? fv(brkPrincipal, fvBrkRate, h) : 0;
  return savingsFv + retFv + brkFv;
}

export function computeGrowthScenarioRangePreview(
  c: ComputedSnapshot,
  retRate: number,
  brkRate: number,
  inputs?: GrowthScenarioRangePreviewInputs,
): GrowthScenarioRangeRow[] {
  const h = c.yearsToRetirement;
  const marketApplied = inputs ? isMarketScenarioApplied(inputs) : false;
  const marketScenarioId = inputs ? effectiveMarketScenarioId(inputs) : "base";
  const baseRetRate = marketApplied
    ? effectiveGlobalBaseRate(retRate, marketScenarioId, h)
    : retRate;
  const baseBrkRate = marketApplied
    ? effectiveGlobalBaseRate(brkRate, marketScenarioId, h)
    : brkRate;
  const scenarioLabel = getMarketScenarioDefinition(marketScenarioId).label;
  const { retPrincipal, brkPrincipal } = globalTierAdjustablePrincipal(
    c,
    retRate,
    brkRate,
    inputs,
  );
  const globalTierBaseFv = globalTierExpectedFv(
    retPrincipal,
    brkPrincipal,
    c.save,
    baseRetRate,
    baseBrkRate,
    h,
  );
  /** Match headline portfolio FV (includes custom holdings and account scenarios). */
  const expectedFv = c.totalFV;

  function projectedFor(choice: OutlookScenarioChoice): number {
    const savingsAdj = savingsScenarioDelta(c.save, baseRetRate, choice, h);
    const retDelta = lumpOutlookDelta(retPrincipal, baseRetRate, choice, h);
    const brkDelta = lumpOutlookDelta(brkPrincipal, baseBrkRate, choice, h);
    const globalWingFv =
      globalTierBaseFv + savingsAdj + retDelta + brkDelta;
    return expectedFv + (globalWingFv - globalTierBaseFv);
  }

  const pessimisticFv = projectedFor("very_bear");
  const optimisticFv = projectedFor("very_bull");
  const pessimisticRange = anchoredOutlookScenarioRateRangePcts(
    "very_bear",
    baseRetRate,
    h,
  );
  const optimisticRange = anchoredOutlookScenarioRateRangePcts(
    "very_bull",
    baseRetRate,
    h,
  );

  return [
    {
      id: "very_bear",
      label: "Pessimistic",
      rangeMinPct: pessimisticRange.min,
      rangeMaxPct: pessimisticRange.max,
      projectedFv: pessimisticFv,
      deltaFromExpected: pessimisticFv - expectedFv,
    },
    {
      id: "normal",
      label: "Expected",
      subtext: expectedSubtext(retRate, baseRetRate, marketApplied, scenarioLabel),
      projectedFv: expectedFv,
    },
    {
      id: "very_bull",
      label: "Optimistic",
      rangeMinPct: optimisticRange.min,
      rangeMaxPct: optimisticRange.max,
      projectedFv: optimisticFv,
      deltaFromExpected: optimisticFv - expectedFv,
    },
  ];
}
