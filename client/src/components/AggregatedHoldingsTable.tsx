import { IconArrowNarrowRightDashed } from "@tabler/icons-react";
import { useMemo } from "react";
import type { CalculatorInputs } from "../lib/computeResults";
import type {
  AggregatedSymbolRow,
  ImportedPositionRow,
} from "../lib/positionsCsv";
import {
  aggregateRowHasAccountBreakdown,
  breakdownAggregateByAccount,
} from "../lib/positionsCsv";
import { formatHoldingDescription } from "../lib/holdingsDisplay";
import { truncateForHoldingsTable } from "../lib/holdingDisplay";
import {
  accountScenarioBucketForPositionId,
  getAccountReturnScenario,
  holdingReturnRateSource,
  holdingScenarioOverridesAccount,
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
  tickerKeySetFromImportedRows,
} from "../lib/mergedDashboardPositionModels";
import type { PositionReturnModel } from "../lib/positionReturnModel";
import { fmt } from "../utils/format";
import { BrokerMonogramPill } from "./ui/BrokerMonogramPill";
import { HoldingsSymbolCard } from "./HoldingsSymbolCard";
import { Tooltip } from "./Tooltip";
import "./AggregatedHoldingsTable.scss";

export type HoldingsScenarioBundle = {
  inputs: CalculatorInputs;
  setInputs: (p: Partial<CalculatorInputs>) => void;
  yearsToRetirement: number;
  retirementCalendarYear: number;
  retRate: number;
  brkRate: number;
};

type Props = {
  rows: AggregatedSymbolRow[];
  /** When true, same ticker appeared on more than one import line (e.g. multiple accounts). */
  combinedLines: boolean;
  /** Full merged import rows (for return model ids). */
  importedPositionRows: ImportedPositionRow[];
  /** Dashboard only: enables scenario popout on each row. */
  scenarioBundle?: HoldingsScenarioBundle | null;
  /** Tax bucket for account-level scenario inheritance in this table. */
  accountScenarioBucket?: AccountScenarioBucketId;
};

function modelsForAggregateRow(
  row: AggregatedSymbolRow,
  merged: PositionReturnModel[],
): PositionReturnModel[] {
  const keys = tickerKeySetFromImportedRows(row.contributingRows);
  return mergedDashboardModelsForTickerKeys(merged, keys);
}

type HoldingGroupProps = {
  row: AggregatedSymbolRow;
  scenarioBundle?: HoldingsScenarioBundle | null;
  accountScenarioBucket?: AccountScenarioBucketId;
  mergedModels: PositionReturnModel[];
  h: number;
  showMergedTickerNote: boolean;
};

function AggregatedHoldingGroup({
  row: r,
  scenarioBundle,
  accountScenarioBucket,
  mergedModels,
  h,
  showMergedTickerNote,
}: HoldingGroupProps) {
  const hasBreakdown = aggregateRowHasAccountBreakdown(r);
  const breakdown = useMemo(
    () => (hasBreakdown ? breakdownAggregateByAccount(r) : []),
    [hasBreakdown, r],
  );
  const fullDesc = formatHoldingDescription(r.description);
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

  const overridesAccountScenario =
    primaryModel && accountScenario && scenarioBundle
      ? holdingScenarioOverridesAccount(primaryModel, accountScenario, primaryBlended, h)
      : false;

  const scenarioProps = scenarioBundle
    ? {
        symbol: r.symbol,
        scopeKey: `${accountScenarioBucket ?? 'all'}:${r.symbol}`,
        contributingRows: r.contributingRows,
        label,
        common: displayChoice,
        variant: (rateSource === "custom" ? "badge" : "outline") as
          | "badge"
          | "outline",
        customPctDecimal: customDec,
        inheritAccent:
          rateSource === "account" && accountInheritChoice !== "default"
            ? accountInheritChoice
            : null,
        rateSource,
        overridesAccountScenario,
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
              <BrokerMonogramPill source={line.brokerSource} plaidConnected={line.brokerSource === 'plaid'} />
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
export function AggregatedHoldingsTable({
  rows,
  combinedLines,
  importedPositionRows,
  scenarioBundle,
  accountScenarioBucket,
}: Props) {
  const mergedModels = useMemo(() => {
    if (!scenarioBundle) return [] as PositionReturnModel[];
    return computeMergedDashboardPositionModels(
      scenarioBundle.inputs,
      importedPositionRows,
      scenarioBundle.yearsToRetirement,
      scenarioBundle.retirementCalendarYear,
    );
  }, [scenarioBundle, importedPositionRows]);

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
          <AggregatedHoldingGroup
            key={r.symbol}
            row={r}
            scenarioBundle={scenarioBundle}
            accountScenarioBucket={accountScenarioBucket}
            mergedModels={mergedModels}
            h={h}
            showMergedTickerNote={showCombinedNote}
          />
        ))}
      </div>
    </div>
  );
}
