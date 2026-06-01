import { IconArrowNarrowRightDashed } from "@tabler/icons-react";
import { useMemo } from "react";
import type { CalculatorInputs } from "../lib/computeResults";
import type {
  AggregatedFidelitySymbolRow,
  FidelityPositionRow,
} from "../lib/fidelityCsv";
import {
  aggregateRowHasAccountBreakdown,
  breakdownAggregateByAccount,
  normalizeFidelityImportSymbol,
} from "../lib/fidelityCsv";
import { formatFidelityDescription } from "../lib/fidelityDisplay";
import { truncateForHoldingsTable } from "../lib/fidelityHoldingDisplay";
import {
  accountScenarioBucketForPositionId,
  getAccountReturnScenario,
  holdingReturnRateSource,
  inferAccountScenarioUiChoice,
  type AccountScenarioBucketId,
} from "../lib/accountReturnScenario";
import {
  inferCommonScenarioChoiceForModels,
  HOLDING_SCENARIO_PLACEHOLDER_LABEL,
  scenarioColumnShortLabel,
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from "../lib/holdingScenarioApply";
import {
  blendedRateForDashboardPositionId,
  computeMergedDashboardPositionModels,
  mergedDashboardModelsForTickerKeys,
  tickerKeySetFromFidelityRows,
} from "../lib/mergedDashboardPositionModels";
import type { PositionReturnModel } from "../lib/positionReturnModel";
import { fmt } from "../utils/format";
import { HoldingsSymbolCard } from "./HoldingsSymbolCard";
import { Tooltip } from "./Tooltip";
import "./FidelityAggregatedSymbolTable.scss";

export type FidelityAggregatedScenarioBundle = {
  inputs: CalculatorInputs;
  setInputs: (p: Partial<CalculatorInputs>) => void;
  yearsToRetirement: number;
  retirementCalendarYear: number;
  retRate: number;
  brkRate: number;
};

type Props = {
  rows: AggregatedFidelitySymbolRow[];
  /** When true, same ticker appeared on more than one import line (e.g. multiple accounts). */
  combinedLines: boolean;
  /** Full merged import rows (for return model ids). */
  fidelityAllRows: FidelityPositionRow[];
  /** Dashboard only: enables Scenario column + slide panel (parent hosts panel). */
  scenarioBundle?: FidelityAggregatedScenarioBundle | null;
  /** Tax bucket for account-level scenario inheritance in this table. */
  accountScenarioBucket?: AccountScenarioBucketId;
  /** Which ticker’s scenario sheet is open (symbol display key, matches row `symbol`). */
  activeScenarioSymbol?: string | null;
  onScenarioOpen?: (payload: {
    symbol: string;
    contributingRows: FidelityPositionRow[];
  }) => void;
};

function modelsForAggregateRow(
  row: AggregatedFidelitySymbolRow,
  merged: PositionReturnModel[],
): PositionReturnModel[] {
  const keys = tickerKeySetFromFidelityRows(row.contributingRows);
  return mergedDashboardModelsForTickerKeys(merged, keys);
}

type HoldingGroupProps = {
  row: AggregatedFidelitySymbolRow;
  scenarioBundle?: FidelityAggregatedScenarioBundle | null;
  accountScenarioBucket?: AccountScenarioBucketId;
  mergedModels: PositionReturnModel[];
  h: number;
  activeScenarioSymbol?: string | null;
  onScenarioOpen?: (payload: {
    symbol: string;
    contributingRows: FidelityPositionRow[];
  }) => void;
  showMergedTickerNote: boolean;
};

function FidelityAggregatedHoldingGroup({
  row: r,
  scenarioBundle,
  accountScenarioBucket,
  mergedModels,
  h,
  activeScenarioSymbol,
  onScenarioOpen,
  showMergedTickerNote,
}: HoldingGroupProps) {
  const hasBreakdown = aggregateRowHasAccountBreakdown(r);
  const breakdown = useMemo(
    () => (hasBreakdown ? breakdownAggregateByAccount(r) : []),
    [hasBreakdown, r],
  );
  const fullDesc = formatFidelityDescription(r.description);
  const shortDesc = truncateForHoldingsTable(fullDesc);
  const showTip = fullDesc.length > shortDesc.length;
  const modelsAll = scenarioBundle
    ? modelsForAggregateRow(r, mergedModels)
    : [];
  const models =
    accountScenarioBucket != null
      ? modelsAll.filter(
          (m) =>
            accountScenarioBucketForPositionId(m.id) === accountScenarioBucket,
        )
      : modelsAll;
  const blendedForModel = (m: PositionReturnModel) =>
    blendedRateForDashboardPositionId(
      m.id,
      scenarioBundle!.retRate,
      scenarioBundle!.brkRate,
    );
  const primaryModel = models[0];
  const accountScenario =
    scenarioBundle && accountScenarioBucket
      ? getAccountReturnScenario(scenarioBundle.inputs, accountScenarioBucket)
      : undefined;
  const primaryBlended = primaryModel
    ? blendedForModel(primaryModel)
    : (scenarioBundle?.retRate ?? 0);
  const rateSource =
    primaryModel && scenarioBundle
      ? holdingReturnRateSource(primaryModel, accountScenario, primaryBlended)
      : "global";
  const displayChoice: ScenarioUiChoice | typeof SCENARIO_MIXED = (() => {
    if (!scenarioBundle || !models.length) return SCENARIO_MIXED;
    if (rateSource === "custom") {
      return inferCommonScenarioChoiceForModels(models, h, blendedForModel);
    }
    if (rateSource === "account" && accountScenario) {
      return inferAccountScenarioUiChoice(accountScenario, primaryBlended, h);
    }
    return "default";
  })();
  const customDec =
    displayChoice === "custom" && rateSource === "custom" && models[0]
      ? models[0].flatRate
      : displayChoice === "custom" &&
          rateSource === "account" &&
          accountScenario
        ? accountScenario.flatRate
        : undefined;
  const label =
    scenarioBundle == null
      ? "—"
      : rateSource === "custom"
        ? scenarioColumnShortLabel(displayChoice, customDec)
        : HOLDING_SCENARIO_PLACEHOLDER_LABEL;
  const rowKey = r.symbol;
  const rowActive =
    activeScenarioSymbol != null &&
    normalizeFidelityImportSymbol(activeScenarioSymbol).toUpperCase() ===
      normalizeFidelityImportSymbol(rowKey).toUpperCase();

  const openScenario = () =>
    onScenarioOpen?.({
      symbol: r.symbol,
      contributingRows: r.contributingRows,
    });

  const descNode = showTip ? (
    <Tooltip content={fullDesc} placement="top">
      <span className="holdings-symbol-card__desc holdings-symbol-card__desc--trunc">
        {shortDesc}
      </span>
    </Tooltip>
  ) : (
    <span
      className="holdings-symbol-card__desc holdings-symbol-card__desc--trunc"
      title={fullDesc}
    >
      {shortDesc}
    </span>
  );

  const accountInheritChoice =
    accountScenario && accountScenarioBucket
      ? inferAccountScenarioUiChoice(accountScenario, primaryBlended, h)
      : null;

  const scenarioProps = scenarioBundle
    ? {
        label,
        common: displayChoice,
        variant: (rateSource === "custom" ? "badge" : "outline") as
          | "badge"
          | "outline",
        inheritAccent:
          rateSource === "account" && accountInheritChoice !== "default"
            ? accountInheritChoice
            : null,
        rowActive,
        onOpen: openScenario,
        rateSource,
      }
    : null;

  const breakdownNote = showMergedTickerNote ? (
    <p className="holdings-symbol-card__breakdown-note">Ticker is in:</p>
  ) : null;

  const breakdownBlock = hasBreakdown ? (
    <div className="holdings-breakdown-block">
      {breakdown.map((line) => (
        <div
          key={`${rowKey}-${line.accountKey}`}
          className="holdings-breakdown-row"
        >
          <div className="holdings-breakdown-row__inner">
            <div className="holdings-breakdown-row__account-cell">
              <span className="holdings-breakdown-row__source" aria-hidden>
                <IconArrowNarrowRightDashed size={12} stroke={1.15} />
              </span>
              <span className="holdings-breakdown-row__account">
                {line.accountLabel}
              </span>
            </div>
            <span className="holdings-breakdown-row__value">
              {fmt(line.currentValue)}
            </span>
          </div>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className="holdings-symbol-group">
      <HoldingsSymbolCard
        scenarioActive={rowActive}
        symbol={r.symbol}
        description={descNode}
        currentValue={r.currentValue}
        costBasis={r.costBasis}
        scenario={scenarioProps}
        breakdownNote={breakdownNote}
        breakdown={breakdownBlock}
      />
    </div>
  );
}

/** Single table: one row per symbol (totals across accounts in the parent tax bucket). */
export function FidelityAggregatedSymbolTable({
  rows,
  combinedLines,
  fidelityAllRows,
  scenarioBundle,
  accountScenarioBucket,
  activeScenarioSymbol,
  onScenarioOpen,
}: Props) {
  const mergedModels = useMemo(() => {
    if (!scenarioBundle) return [] as PositionReturnModel[];
    return computeMergedDashboardPositionModels(
      scenarioBundle.inputs,
      fidelityAllRows,
      scenarioBundle.yearsToRetirement,
      scenarioBundle.retirementCalendarYear,
    );
  }, [scenarioBundle, fidelityAllRows]);

  const h = scenarioBundle
    ? Math.max(1, Math.min(50, Math.round(scenarioBundle.yearsToRetirement)))
    : 7;

  const showCombinedNote =
    combinedLines || rows.some((r) => aggregateRowHasAccountBreakdown(r));

  if (!rows.length) return null;

  return (
    <div
      className={[
        "holdings-positions-table",
        "holdings-symbol-table",
        !scenarioBundle && "holdings-symbol-table--no-scenario",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="holdings-symbol-list"
        role="table"
        aria-label="Holdings by symbol"
      >
        {rows.map((r) => (
          <FidelityAggregatedHoldingGroup
            key={r.symbol}
            row={r}
            scenarioBundle={scenarioBundle}
            accountScenarioBucket={accountScenarioBucket}
            mergedModels={mergedModels}
            h={h}
            activeScenarioSymbol={activeScenarioSymbol}
            onScenarioOpen={onScenarioOpen}
            showMergedTickerNote={showCombinedNote}
          />
        ))}
      </div>
    </div>
  );
}
