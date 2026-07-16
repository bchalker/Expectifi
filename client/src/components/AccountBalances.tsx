import type {
  AnimationEvent,
  ChangeEvent,
  CSSProperties,
  ReactNode,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOverlayState } from "@heroui/react";
import type { CalculatorInputs, ComputedSnapshot } from "../lib/computeResults";
import {
  aggregatePositionsBySymbol,
  isPendingActivityImportRow,
  mapRowToBucket,
  normalizeImportSymbol,
  positionsForBrokerage,
  positionsForTaxTreatment,
  type ImportedPositionRow,
} from "../lib/positionsCsv";
import {
  flattenBatches,
  loadStoredPositionsImport,
} from "../lib/positionsImportStorage";
import {
  activeManualAccountEntries,
  aggregateManualAccountsToBases,
  deriveManualAccountEntriesFromBalances,
  getAccountTypeMeta,
  loadStoredManualAccounts,
  manualAccountEntryForBucket,
  manualEntryIdForAccountType,
  saveCompletedManualAccounts,
  saveManualAccountsFromBucketBases,
  type AllocationProfile,
  type ManualAccountEntry,
  type OnboardingAccountType,
} from "../lib/manualAccountEntries";
import {} from "../lib/allocationProfile";
import { ManualAccountAllocationSlider } from "./ManualAccountAllocationSlider";
import "./ManualAccountAllocationSlider.scss";
import { ManualAccountBalanceField } from "./ManualAccountBalanceField";
import type { BrokerageBalanceMode } from "../lib/brokerageBalanceMode";
import type { BalanceInputMode } from "../lib/retirementBalanceMode";
import {
  accountLabelForWithdrawalBucket,
  localeSupportsWithdrawalBucket,
} from "../config/taxConfig";
import { resolveBucketRowHint } from "../hints/buildHintContext";
import type { ScenarioIntentTabId } from "./HoldingScenarioIntentTabs";
import { annualWithdrawalForAccountBucket } from "../lib/accountBucketWithdrawal";
import { AccountBucketHint } from "./AccountBucketHint";
import { AccountBucketWithdrawalPill } from "./AccountBucketWithdrawalPill";
import { useUserLocale } from "../context/UserLocaleContext";
import {
  withdrawalBadgeAndHint,
  withdrawalBucketOrder,
  type WithdrawalDisplayBucket,
} from "../lib/withdrawalDisplayOrder";
import type { PositionsCsvCustodian } from "../lib/positionsCsvImport";
import {
  inputsHavePlanningProfileFields,
  planningDisplayFromInputs,
} from "../lib/userPrefs";
import {
  loadPlanProfile,
  profileHasOnboardingComplete,
} from "../lib/planStorage/profile";
import {
  hasImportedPortfolioData,
  hasManualPortfolioAmounts,
  IMPORT_REMOVED_ON_MANUAL_MSG,
  MANUAL_REMOVED_ON_CONNECT_MSG,
  resolvePortfolioBalanceMode,
} from "../lib/portfolioSourceExclusivity";
import { incomeBalanceForProjection } from "../lib/accountIncomeMonthly";
import { fmt, fmtInput, fmtMon, parseNum } from "../utils/format";
import { currencySymbol } from "../lib/displayCurrency";
import {
  accountScenarioBucketForPositionId,
  accountScenarioIsActive,
  blendedRateForAccountBucket,
  getAccountReturnScenario,
  inferAccountScenarioUiChoice,
  type AccountScenarioBucketId,
} from "../lib/accountReturnScenario";
import {
  horizonClamp,
  scenarioColumnShortLabel,
  ACCOUNT_SCENARIO_PLACEHOLDER_LABEL,
} from "../lib/holdingScenarioApply";
import {
  computeMergedDashboardPositionModels,
  blendedRateForDashboardPositionId,
} from "../lib/mergedDashboardPositionModels";
import {
  ManualBalancesPlanStep,
  type ManualPlanDraft,
} from "./ManualBalancesPlanStep";
import {
  MANUAL_PLAN_POST_FADE_PAUSE_MS,
  markPortfolioBalancesFlush,
  PORTFOLIO_REVEAL_START_DELAY_MS,
  schedulePortfolioWaveReveal,
} from "../lib/portfolioWaveReveal";
import { clearPostOnboardingImportSession } from "../lib/guestEphemeralStorage";
import { positionUsesCustomReturnMode } from "../lib/positionReturnModel";
import { computeBucketTrendDisplay } from "../lib/bucketHoldingTrend";
import {
  AggregatedHoldingsTable,
  type HoldingsScenarioBundle,
} from "./AggregatedHoldingsTable";
import { AccountScenarioPopoutDataProvider } from "../context/AccountScenarioPopoutDataContext";
import {
  ScenarioPopoutProvider,
  useScenarioPopout,
} from "../context/ScenarioPopoutContext";
import {
  PortfolioBucketAccountRow,
  type PortfolioBucketAccountScenarioProps,
} from "./PortfolioBucketAccountRow";
import { PositionsCsvImport } from "./PositionsCsvImport";
import { AppOverlayScrollbars } from "./ui/AppOverlayScrollbars";
import {
  MarketScenarioButtonGroup,
  MarketScenarioSelector,
} from "./MarketScenarioSelector";
import { MarketScenarioContextRow } from "./MarketScenarioContextRow";
import {
  ACCOUNT_GROWTH_COLORS,
  accountGrowthScenarioRate,
  buildAccountGrowthBarData,
  formatGrowthBarValue,
} from "../lib/accountGrowthBar";
import { TaxBreakdownPanelTrigger } from "./TaxBreakdownHeaderButton";
import {
  AccountBalancesManageMenu,
  type ManageOverlayPhase,
  type ManageOverlayPhaseHeader,
} from "./AccountBalancesManageMenu";
import {
  marketScenarioIsBase,
  normalizeMarketScenarioId,
} from "../lib/marketScenario";
import { aggregatedHoldingsForScenarioGuide } from "../lib/holdingScenarioGuideExamples";
import { ImportedHoldingsScenarioGuide } from "./ImportedHoldingsScenarioGuide";
import { IncomeAccountRow } from "./IncomeAccountRow";
import {
  buildIncomeAccountAccordionContent,
  buildIncomeAccountAccordionParams,
} from "../lib/incomeAccountAccordionContent";
import { resolveAccountIncomeFundTicker } from "../lib/accountIncomeFund";
import {
  canonicalIncomeStorageKeyForBucket,
  canonicalIncomeStorageKeyForEntry,
  canonicalIncomeStorageKeyForManualId,
} from "../lib/accountIncomeStorage";
import {
  computeAccountIncomeBreakdown,
  defaultWithdrawRateForStrategy,
  resolveAccountIncomeStrategy,
  resolveAccountWithdrawRate,
  type AccountIncomeStrategy,
} from "../lib/accountIncomeStrategy";
import { monthlyPortfolioIncomeFromAccountStrategies } from "../lib/accountIncomeMonthly";
import { currentBalanceForAccountBucket } from "../lib/accountBucketRetirementBalance";
import { ManualProjectionsCallout } from "./ManualProjectionsCallout";
import { PlaidConnectionProvider } from "./PlaidConnectionHeader";
import { AppButton } from "./ui/AppButton";
import "./AccountBalancesTaxDisclosure.scss";
import "./AccountBalancesCustomScenario.scss";

type BucketKey =
  | "ret401k"
  | "se401k"
  | "tradIra"
  | "roth"
  | "hsa"
  | "brokerage";

type ManualBalanceTaxTone = "trad" | "roth" | "hsa" | "taxable";

type ManualBalanceRow = {
  key: BucketKey;
  label: string;
  taxKind: string;
  taxDesc: string;
  tone: ManualBalanceTaxTone;
};

function ManualBalanceRowLabel({
  label,
  taxKind,
  taxDesc,
  tone,
}: Pick<ManualBalanceRow, "label" | "taxKind" | "taxDesc" | "tone">) {
  return (
    <div className="edit-row-label-stack">
      <span className="edit-row-label__name">{label}</span>
      <p className={`edit-row-label__tax edit-row-label__tax--${tone}`}>
        <span className="edit-row-label__tax-kind">{taxKind}</span>
        <span className="edit-row-label__tax-desc">{taxDesc}</span>
      </p>
    </div>
  );
}

/** Pre-tax display total — must match `retBal` (includes Traditional IRA). */
function retirementPretaxDisplayTotal(bal: ComputedSnapshot["bal"]): number {
  return bal.bal401k + bal.balSE401k + bal.balTradIRA;
}

/** Onboarding / saved profile already captured DOB, retirement age, and contributions. */
function shouldSkipManualBalancesPlanStep(
  inputs: CalculatorInputs | undefined,
): boolean {
  if (profileHasOnboardingComplete(loadPlanProfile())) return true;
  return Boolean(inputs && inputsHavePlanningProfileFields(inputs));
}

function manualPlanDraftForCommit(inputs: CalculatorInputs): ManualPlanDraft {
  const display = planningDisplayFromInputs(inputs);
  return {
    dateOfBirth: display.dateOfBirth,
    targetRetirementAge: display.targetRetirementAge,
    save: display.save,
  };
}

type ManualBalancesDraft = {
  base401k: number;
  baseSE401k: number;
  baseTradIRA: number;
  baseRoth: number;
  baseHsa: number;
  brkBal: number;
  allocations: Partial<Record<BucketKey, AllocationProfile>>;
  allocationEquityPct: Partial<Record<BucketKey, number>>;
};

const BUCKET_ACCOUNT_TYPE: Record<BucketKey, OnboardingAccountType> = {
  ret401k: "trad_401k",
  se401k: "sep_ira",
  tradIra: "trad_ira",
  roth: "roth_ira",
  hsa: "hsa",
  brokerage: "brokerage",
};

const BUCKET_BASE_FIELD: Record<
  BucketKey,
  Exclude<keyof ManualBalancesDraft, "allocations" | "allocationEquityPct">
> = {
  ret401k: "base401k",
  se401k: "baseSE401k",
  tradIra: "baseTradIRA",
  roth: "baseRoth",
  hsa: "baseHsa",
  brokerage: "brkBal",
};

function manualAllocationsFromEntries(
  entries: ManualAccountEntry[],
): Partial<Record<BucketKey, AllocationProfile>> {
  const typeToBucket = Object.fromEntries(
    Object.entries(BUCKET_ACCOUNT_TYPE).map(([bucket, type]) => [
      type,
      bucket as BucketKey,
    ]),
  ) as Partial<Record<OnboardingAccountType, BucketKey>>;
  const out: Partial<Record<BucketKey, AllocationProfile>> = {};
  for (const entry of entries) {
    if (!entry.type || entry.allocation_profile == null) continue;
    const bucket = typeToBucket[entry.type];
    if (bucket) out[bucket] = entry.allocation_profile;
  }
  return out;
}

function manualEquityPctFromEntries(
  entries: ManualAccountEntry[],
): Partial<Record<BucketKey, number>> {
  const typeToBucket = Object.fromEntries(
    Object.entries(BUCKET_ACCOUNT_TYPE).map(([bucket, type]) => [
      type,
      bucket as BucketKey,
    ]),
  ) as Partial<Record<OnboardingAccountType, BucketKey>>;
  const out: Partial<Record<BucketKey, number>> = {};
  for (const entry of entries) {
    if (!entry.type || entry.allocation_equity_pct == null) continue;
    const bucket = typeToBucket[entry.type];
    if (bucket) out[bucket] = entry.allocation_equity_pct;
  }
  return out;
}

function manualBucketAllocationsFromDraft(
  draft: ManualBalancesDraft,
): Partial<
  Record<
    | "base401k"
    | "baseSE401k"
    | "baseTradIRA"
    | "baseRoth"
    | "baseHsa"
    | "brkBal",
    AllocationProfile
  >
> {
  const out: Partial<
    Record<
      | "base401k"
      | "baseSE401k"
      | "baseTradIRA"
      | "baseRoth"
      | "baseHsa"
      | "brkBal",
      AllocationProfile
    >
  > = {};
  const allocations = draft.allocations ?? {};
  for (const bucket of Object.keys(BUCKET_ACCOUNT_TYPE) as BucketKey[]) {
    const profile = allocations[bucket];
    if (profile == null) continue;
    out[BUCKET_BASE_FIELD[bucket]] = profile;
  }
  return out;
}

function manualBucketEquityPctFromDraft(
  draft: ManualBalancesDraft,
): Partial<
  Record<
    | "base401k"
    | "baseSE401k"
    | "baseTradIRA"
    | "baseRoth"
    | "baseHsa"
    | "brkBal",
    number
  >
> {
  const out: Partial<
    Record<
      | "base401k"
      | "baseSE401k"
      | "baseTradIRA"
      | "baseRoth"
      | "baseHsa"
      | "brkBal",
      number
    >
  > = {};
  const equityPct = draft.allocationEquityPct ?? {};
  for (const bucket of Object.keys(BUCKET_ACCOUNT_TYPE) as BucketKey[]) {
    const pct = equityPct[bucket];
    if (pct == null) continue;
    out[BUCKET_BASE_FIELD[bucket]] = pct;
  }
  return out;
}

type Props = {
  c: ComputedSnapshot;
  /** Omit or no-op when `readOnly` — dashboard output only. */
  onBases?: (
    b: Partial<{
      base401k: number;
      baseSE401k: number;
      baseTradIRA: number;
      baseRoth: number;
      baseHsa: number;
      brkBal: number;
    }>,
  ) => void;
  balanceMode: BalanceInputMode;
  onBalanceModeChange?: (m: BalanceInputMode) => void;
  positionsImportRev: number;
  /** Bumps when onboarding/manual account rows change. */
  manualAccountsRev?: number;
  /** Tighter bottom margin when Brokerage card follows in the same visual group. */
  stackWithBrokerage?: boolean;
  onImportedApplyBalances?: (
    partial: Pick<
      CalculatorInputs,
      "base401k" | "baseSE401k" | "baseRoth" | "baseHsa" | "brkBal"
    >,
  ) => void;
  onPositionsImportApplied?: () => void;
  /** Clear CSV/Plaid import storage when user commits manual amounts. */
  onClearImportedForManual?: () => void;
  /** Clear manual balances, stored import, and per-holding return overrides for this card. */
  onRemoveRetirementAccounts?: () => void;
  /** When true, show balances and Fidelity breakdown only (no mode toggle, CSV import, or manual fields). */
  readOnly?: boolean;
  /** Dashboard: pass through for per-holding return sliders when `readOnly` + Fidelity mode. */
  inputs?: CalculatorInputs;
  setInputs?: (p: Partial<CalculatorInputs>) => void;
  /** After manual confirm + plan step: DOB, retirement age, annual savings. */
  onManualPortfolioPlanApplied?: (plan: ManualPlanDraft) => void;
  /** When set, the matching bucket opens the return editor popover for this id (strip GrowthSliderLabel). */
  openReturnEditorRequest?: {
    positionId: string;
    anchorTop: number;
    nonce: number;
  } | null;
  onReturnEditorOpenHandled?: () => void;
  /**
   * Configure drawer: show mode toggle + CSV import; in manual mode keep dollar inputs. In Fidelity mode hide per-account totals /
   * holdings (dashboard only). Hides the total retirement summary bar here.
   */
  configureInputsOnly?: boolean;
  /** Dashboard: show taxable brokerage inside the same card as retirement buckets (with matching disclosure layout). */
  mergeBrokerageInRetirementCard?: boolean;
  brkBal?: number;
  brkRate?: number;
  brokerageMode?: BrokerageBalanceMode;
  onOpenSignIn?: () => void;
  onOpenUpgradeCsv?: () => void;
  /** Increment to open the CSV import panel once (e.g. after welcome connect). */
  openImportRequest?: number;
  onImportOpenHandled?: () => void;
  /** True while finishing onboarding via “Add your accounts”. */
  postOnboardingImportActive?: boolean;
  onPostOnboardingImportCancel?: () => void;
  /** After manual balances are committed to expectifi/accounts-v1. */
  onManualAccountsCommitted?: () => void;
  /** Growth vs income — drives personalized bucket row hints. */
  phase?: "growth" | "income";
  /** Opens Configure → Social Security / CPP tab (hint link). */
  onOpenSocialSecurity?: () => void;
  /** Per-account dividend fund selections (income phase). */
  accountIncomeFunds?: Record<string, string>;
  onAccountIncomeFundChange?: (storageKey: string, ticker: string) => void;
  /** Per-account income strategy (income phase). */
  accountIncomeStrategies?: Record<string, AccountIncomeStrategy>;
  onAccountIncomeStrategyChange?: (
    storageKey: string,
    strategy: AccountIncomeStrategy,
  ) => void;
  /** Per-account withdrawal rate when strategy is withdraw or both. */
  accountWithdrawRates?: Record<string, number>;
  onAccountWithdrawRateChange?: (storageKey: string, rate: number) => void;
};

const REMOVE_ACCOUNTS_CONFIRM_BODY =
  "Remove all account balances from this card? Manual totals, imported positions, and custom return overrides for these accounts will be cleared.";

export function AccountBalances(props: Props) {
  return (
    <ScenarioPopoutProvider>
      <AccountBalancesContent {...props} />
    </ScenarioPopoutProvider>
  );
}

function AccountBalancesContent({
  c,
  onBases,
  balanceMode,
  onBalanceModeChange,
  positionsImportRev,
  manualAccountsRev = 0,
  stackWithBrokerage,
  onImportedApplyBalances,
  onPositionsImportApplied,
  onClearImportedForManual,
  onRemoveRetirementAccounts,
  readOnly = false,
  inputs,
  setInputs,
  onManualPortfolioPlanApplied,
  openReturnEditorRequest,
  onReturnEditorOpenHandled,
  configureInputsOnly = false,
  mergeBrokerageInRetirementCard = false,
  brkBal,
  brkRate,
  brokerageMode,
  onOpenUpgradeCsv,
  openImportRequest,
  onImportOpenHandled,
  postOnboardingImportActive = false,
  onPostOnboardingImportCancel,
  onManualAccountsCommitted,
  phase = "growth",
  onOpenSocialSecurity,
  accountIncomeFunds = {},
  onAccountIncomeFundChange,
  accountIncomeStrategies = {},
  onAccountIncomeStrategyChange,
  accountWithdrawRates = {},
  onAccountWithdrawRateChange,
}: Props) {
  const { locale, taxConfig } = useUserLocale();
  const mergedDashboard = mergeBrokerageInRetirementCard && readOnly;
  const showGrowthBars = Boolean(
    phase === "growth" &&
    mergedDashboard &&
    readOnly &&
    !configureInputsOnly &&
    c.hasPortfolioBalances &&
    inputs,
  );

  const displayBalanceMode = useMemo(
    () => resolvePortfolioBalanceMode(balanceMode),
    [balanceMode, positionsImportRev, manualAccountsRev],
  );

  useEffect(() => {
    if (!onBalanceModeChange || balanceMode === "imported") return;
    if (displayBalanceMode !== "imported") return;
    onBalanceModeChange("imported");
  }, [balanceMode, displayBalanceMode, onBalanceModeChange]);

  const holdingsScenarioEditingEnabled = Boolean(
    readOnly && inputs && setInputs && displayBalanceMode === "imported",
  );
  const accountScenarioEditingEnabled = Boolean(
    readOnly &&
    inputs &&
    setInputs &&
    (displayBalanceMode === "imported" || displayBalanceMode === "manual"),
  );
  const retirementAge = inputs?.targetRetirementAge ?? c.targetRetirementAge;
  const marketScenarioId = normalizeMarketScenarioId(inputs?.marketScenario);
  const showMarketScenarioContext = Boolean(
    phase === "growth" &&
    inputs &&
    !marketScenarioIsBase(marketScenarioId) &&
    c.hasPortfolioBalances,
  );

  const [marketScenarioCardMounted, setMarketScenarioCardMounted] = useState(
    showMarketScenarioContext,
  );

  useEffect(() => {
    if (showMarketScenarioContext) {
      setMarketScenarioCardMounted(true);
      return;
    }
    const exitTimer = window.setTimeout(
      () => setMarketScenarioCardMounted(false),
      150,
    );
    return () => window.clearTimeout(exitTimer);
  }, [showMarketScenarioContext]);

  const importedPositionRows = useMemo(() => {
    void positionsImportRev;
    void balanceMode;
    void manualAccountsRev;
    const imp = loadStoredPositionsImport();
    if (!imp?.batches?.length) return [] as ImportedPositionRow[];
    return flattenBatches(imp.batches);
  }, [positionsImportRev, balanceMode, manualAccountsRev]);

  const aggregatedHoldingsForGuide = useMemo(
    () => aggregatedHoldingsForScenarioGuide(importedPositionRows),
    [importedPositionRows],
  );

  const [allocationEntriesPatch, setAllocationEntriesPatch] = useState<
    ManualAccountEntry[] | null
  >(null);
  const manualEntriesHydrationAttempted = useRef(false);
  const onManualAccountsCommittedRef = useRef(onManualAccountsCommitted);
  onManualAccountsCommittedRef.current = onManualAccountsCommitted;
  useEffect(() => {
    setAllocationEntriesPatch(null);
  }, [manualAccountsRev]);

  const manualRowEditingEnabled = Boolean(
    mergedDashboard && displayBalanceMode === "manual" && onBases,
  );

  const manualAccountEntries = useMemo(() => {
    void manualAccountsRev;
    if (allocationEntriesPatch) {
      return allocationEntriesPatch.filter(
        (e) => e.type != null && e.balance > 0,
      );
    }
    const storedActive = activeManualAccountEntries(loadStoredManualAccounts());
    if (storedActive.length > 0) return storedActive;
    if (!mergedDashboard || displayBalanceMode !== "manual") return [];
    return deriveManualAccountEntriesFromBalances(c.bal, brkBal ?? 0).filter(
      (e) => e.type != null && e.balance > 0,
    );
  }, [
    manualAccountsRev,
    allocationEntriesPatch,
    mergedDashboard,
    displayBalanceMode,
    c.bal.bal401k,
    c.bal.balSE401k,
    c.bal.balTradIRA,
    c.bal.balRoth,
    c.bal.balHsa,
    brkBal,
  ]);

  useEffect(() => {
    if (!mergedDashboard || displayBalanceMode !== "manual") return;
    if (manualEntriesHydrationAttempted.current) return;
    if (activeManualAccountEntries(loadStoredManualAccounts()).length > 0) {
      manualEntriesHydrationAttempted.current = true;
      return;
    }
    const derived = deriveManualAccountEntriesFromBalances(
      c.bal,
      brkBal ?? 0,
    ).filter((e) => e.type != null && e.balance > 0);
    if (derived.length === 0) return;
    manualEntriesHydrationAttempted.current = true;
    saveCompletedManualAccounts(derived);
    if (activeManualAccountEntries(loadStoredManualAccounts()).length > 0) {
      onManualAccountsCommittedRef.current?.();
    }
  }, [
    mergedDashboard,
    displayBalanceMode,
    c.bal.bal401k,
    c.bal.balSE401k,
    c.bal.balTradIRA,
    c.bal.balRoth,
    c.bal.balHsa,
    brkBal,
  ]);

  const brokeragePositions = useMemo(
    () => positionsForBrokerage(importedPositionRows),
    [importedPositionRows],
  );
  const hasImportedBrokerage = brokeragePositions.length > 0;

  const hasAnyImportedRetirement = useMemo(
    () =>
      importedPositionRows.some((r) => {
        if (isPendingActivityImportRow(r)) return false;
        const b = mapRowToBucket(r);
        return b !== "unknown" && b !== "brokerage";
      }),
    [importedPositionRows],
  );

  const hasManualRetirementBalances =
    c.bal.bal401k > 0 ||
    c.bal.balSE401k > 0 ||
    c.bal.balTradIRA > 0 ||
    c.bal.balRoth > 0 ||
    c.bal.balHsa > 0;

  const hasRetirementAccountData =
    displayBalanceMode === "manual"
      ? hasManualRetirementBalances
      : hasAnyImportedRetirement;

  const hasManualBrokerageBalance = (brkBal ?? 0) > 0;
  const hasBrokerageAccountData =
    mergedDashboard && (hasImportedBrokerage || hasManualBrokerageBalance);
  const useImportedBrokerageView =
    mergedDashboard &&
    displayBalanceMode === "imported" &&
    hasBrokerageAccountData;

  const hasAnyAccountCardData =
    hasRetirementAccountData || Boolean(hasBrokerageAccountData);

  const showImportedHoldingsScenarioGuide =
    phase === "growth" &&
    mergedDashboard &&
    readOnly &&
    !configureInputsOnly &&
    hasAnyAccountCardData;

  const showImportedAccountsYieldGuide =
    phase === "income" &&
    mergedDashboard &&
    readOnly &&
    !configureInputsOnly &&
    hasAnyAccountCardData;

  const incomeModeDashboard = phase === "income" && mergedDashboard && readOnly;

  /** Merged dashboard lists brokerage in the same card — footer matches sum of all rows. */
  const portfolioTotal =
    mergedDashboard && hasBrokerageAccountData
      ? c.retBal + (brkBal ?? 0)
      : c.retBal;

  const incomeMonthlyTotal = useMemo(() => {
    if (!incomeModeDashboard || !inputs || !c.hasPortfolioBalances) return 0;
    return monthlyPortfolioIncomeFromAccountStrategies({
      inputs,
      accountIncomeFunds,
      accountIncomeStrategies,
      accountWithdrawRates,
      wdInflation: inputs.wdInflation,
      hsaMedicalAnnualDraw: c.strategy.hsaWdAnn,
      hasPortfolioBalances: c.hasPortfolioBalances,
      retFV: c.retFV,
      brkFV: c.brkFV,
      tradRatio: c.tradRatio,
      rothRatio: c.rothRatio,
      hsaRatio: c.hsaRatio,
      tradBal: c.tradBal,
      rothBal: c.rothBal,
      hsaBal: c.hsaBal,
      brkBal: brkBal ?? 0,
      retirementAge,
      locale,
      manualEntries: manualAccountEntries,
      retirementBalanceMode: displayBalanceMode,
    });
  }, [
    incomeModeDashboard,
    inputs,
    c,
    accountIncomeFunds,
    accountIncomeStrategies,
    accountWithdrawRates,
    brkBal,
    retirementAge,
    locale,
    manualAccountEntries,
    displayBalanceMode,
  ]);

  const portfolioTotalLabel =
    mergedDashboard && hasBrokerageAccountData
      ? "Total balances"
      : "Total retirement";

  const portfolioTotalDisplay = incomeModeDashboard
    ? fmtMon(incomeMonthlyTotal)
    : fmt(portfolioTotal);

  const mergedPositionModels = useMemo(() => {
    if (!mergedDashboard || !inputs) return [];
    return computeMergedDashboardPositionModels(
      inputs,
      importedPositionRows,
      c.yearsToRetirement,
      c.retirementCalendarYear,
    );
  }, [
    mergedDashboard,
    inputs,
    importedPositionRows,
    c.yearsToRetirement,
    c.retirementCalendarYear,
  ]);

  const hasCustomScenarioBadge = useMemo(() => {
    if (!inputs || mergedPositionModels.length === 0) return false;
    return mergedPositionModels.some((m) =>
      positionUsesCustomReturnMode(
        m,
        blendedRateForDashboardPositionId(m.id, inputs.retRate, inputs.brkRate),
      ),
    );
  }, [mergedPositionModels, inputs]);

  const hasMarketScenarioOverrides = useMemo(() => {
    if (!inputs) return false;
    if (hasCustomScenarioBadge) return true;
    return (
      [
        "brokerage",
        "pretax",
        "roth",
        "hsa",
      ] as const satisfies readonly AccountScenarioBucketId[]
    ).some((bucket) => accountScenarioIsActive(inputs, bucket));
  }, [hasCustomScenarioBadge, inputs]);

  const {
    accountOpen,
    openAccountScenario,
    closeAccountScenario,
    isAccountScenarioOpen,
    holdingOpen,
    openHoldingScenario,
    closeHoldingScenario,
  } = useScenarioPopout();
  const [balanceEditPanel, setBalanceEditPanel] = useState<
    "manual" | "import" | null
  >(null);
  const [balanceEditClosing, setBalanceEditClosing] = useState(false);
  const [csvImportPrefillCustodian, setCsvImportPrefillCustodian] =
    useState<PositionsCsvCustodian | null>(null);
  const [openManageRequest, setOpenManageRequest] = useState(0);
  const [closeManageRequest, setCloseManageRequest] = useState(0);
  const [manageMenuOpen, setManageMenuOpen] = useState(false);
  const [manageOverlayPhase, setManageOverlayPhase] =
    useState<ManageOverlayPhase>("method");
  const [manageOverlayLeavingPhase, setManageOverlayLeavingPhase] =
    useState<Exclude<ManageOverlayPhase, "method"> | null>(null);
  const [manageCsvPhaseHeader, setManageCsvPhaseHeader] =
    useState<ManageOverlayPhaseHeader | null>(null);
  const manageOverlayLeaveTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const manageMenuOpenRef = useRef(false);
  const hadAccountCardDataRef = useRef(false);
  const reopenManageAfterBalanceEditCloseRef = useRef(false);
  const [csvFileIngestRequest, setCsvFileIngestRequest] = useState<{
    id: number;
    file: File;
    custodian: PositionsCsvCustodian;
  } | null>(null);
  const financialsCsvPendingCustodianRef = useRef<PositionsCsvCustodian | null>(
    null,
  );
  const financialsCsvFileInputRef = useRef<HTMLInputElement>(null);
  const lastCsvReviewReadyIdRef = useRef<number | null>(null);
  const [manualDraft, setManualDraft] = useState<ManualBalancesDraft | null>(
    null,
  );
  type ManualConfirmPhase = false | "progress" | "plan";
  const [manualConfirmPhase, setManualConfirmPhase] =
    useState<ManualConfirmPhase>(false);
  const [manualConfirmProgress, setManualConfirmProgress] = useState(0);
  const manualConfirmPendingRef = useRef(false);
  const manualConfirmRunRef = useRef(false);
  const pendingManualCommitRef = useRef<{
    balances: ManualBalancesDraft;
    plan: ManualPlanDraft;
  } | null>(null);
  const manualConfirmBusy = manualConfirmPhase === "progress";

  const canEditBalances = Boolean(
    mergedDashboard &&
    onBases &&
    onBalanceModeChange &&
    onImportedApplyBalances,
  );

  const removeAccountsModalState = useOverlayState();
  const [replaceSourceConfirm, setReplaceSourceConfirm] = useState<{
    message: string;
    proceed: () => void;
  } | null>(null);
  const [replaceSourceConfirmClosing, setReplaceSourceConfirmClosing] =
    useState(false);

  const finalizeReplaceSourceConfirmClose = useCallback(() => {
    setReplaceSourceConfirm(null);
    setReplaceSourceConfirmClosing(false);
  }, []);

  const requestReplaceSourceConfirmClose = useCallback(() => {
    if (!replaceSourceConfirm || replaceSourceConfirmClosing) return;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      finalizeReplaceSourceConfirmClose();
      return;
    }
    setReplaceSourceConfirmClosing(true);
  }, [
    finalizeReplaceSourceConfirmClose,
    replaceSourceConfirm,
    replaceSourceConfirmClosing,
  ]);

  const onReplaceSourceConfirmOverlayAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.animationName !== "account-balances-remove-overlay-out") return;
      if (!replaceSourceConfirmClosing) return;
      finalizeReplaceSourceConfirmClose();
    },
    [finalizeReplaceSourceConfirmClose, replaceSourceConfirmClosing],
  );

  const portfolioModes = useMemo(
    () => ({ retirement: balanceMode, brokerage: brokerageMode ?? "imported" }),
    [balanceMode, brokerageMode],
  );

  const willRemoveManualOnConnect = useMemo(() => {
    if (!inputs) return false;
    return hasManualPortfolioAmounts(inputs, portfolioModes);
  }, [inputs, portfolioModes]);

  const willRemoveImportOnManual = useMemo(
    () => hasImportedPortfolioData(),
    [],
  );

  const guardReplaceManual = useCallback(
    (proceed: () => void) => {
      if (!willRemoveManualOnConnect) {
        proceed();
        return;
      }
      setReplaceSourceConfirmClosing(false);
      setReplaceSourceConfirm({
        message: MANUAL_REMOVED_ON_CONNECT_MSG,
        proceed,
      });
    },
    [willRemoveManualOnConnect],
  );

  const guardReplaceImport = useCallback(
    (proceed: () => void) => {
      if (!willRemoveImportOnManual) {
        proceed();
        return;
      }
      setReplaceSourceConfirmClosing(false);
      setReplaceSourceConfirm({
        message: IMPORT_REMOVED_ON_MANUAL_MSG,
        proceed,
      });
    },
    [willRemoveImportOnManual],
  );

  const confirmRemoveAccounts = useCallback(() => {
    removeAccountsModalState.close();
    closeHoldingScenario();
    closeAccountScenario();
    setBalanceEditPanel(null);
    setBalanceEditClosing(false);
    onRemoveRetirementAccounts?.();
  }, [
    removeAccountsModalState,
    onRemoveRetirementAccounts,
    closeAccountScenario,
    closeHoldingScenario,
  ]);

  useEffect(() => {
    const req = openReturnEditorRequest;
    if (!req || !holdingsScenarioEditingEnabled) return;

    const model = mergedPositionModels.find((m) => m.id === req.positionId);
    if (!model?.ticker) return;

    const symbolKey = normalizeImportSymbol(model.ticker).toUpperCase();
    if (!symbolKey) return;

    const contributingRows = importedPositionRows.filter(
      (r) =>
        !isPendingActivityImportRow(r) &&
        normalizeImportSymbol(r.symbol).toUpperCase() === symbolKey,
    );
    if (contributingRows.length === 0) return;

    const bucket = accountScenarioBucketForPositionId(model.id) ?? "all";
    setBalanceEditPanel(null);
    setBalanceEditClosing(false);
    openHoldingScenario({
      symbol: normalizeImportSymbol(model.ticker) || model.ticker,
      scopeKey: `${bucket}:${symbolKey}`,
      contributingRows,
    });
    onReturnEditorOpenHandled?.();
  }, [
    openReturnEditorRequest,
    holdingsScenarioEditingEnabled,
    mergedPositionModels,
    importedPositionRows,
    openHoldingScenario,
    onReturnEditorOpenHandled,
  ]);

  const syncManualEntriesToInputs = useCallback(
    (entries: ManualAccountEntry[]) => {
      if (!onBases) return;
      const bases = aggregateManualAccountsToBases(entries);
      onBases({
        base401k: bases.base401k,
        baseSE401k: bases.baseSE401k,
        baseTradIRA: bases.baseTradIRA,
        baseRoth: bases.baseRoth,
        baseHsa: bases.baseHsa,
        brkBal: bases.brkBal,
      });
    },
    [onBases],
  );

  const patchManualEntryAllocation = useCallback(
    (
      entryId: string,
      profile: AllocationProfile | null,
      equityPct?: number | null,
    ) => {
      const stored = loadStoredManualAccounts();
      const base =
        allocationEntriesPatch ??
        (stored?.entries?.length ? stored.entries : null) ??
        manualAccountEntries;
      const optimistic = base.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              source: entry.source ?? "manual",
              allocation_profile: profile,
              allocation_equity_pct: equityPct ?? null,
            }
          : entry,
      );
      setAllocationEntriesPatch(optimistic);
      saveCompletedManualAccounts(optimistic);
    },
    [allocationEntriesPatch, manualAccountEntries],
  );

  const patchManualEntryBalance = useCallback(
    (entryId: string, balance: number) => {
      const stored = loadStoredManualAccounts();
      const base =
        allocationEntriesPatch ?? stored?.entries ?? manualAccountEntries;
      const rounded = Math.max(0, Math.round(balance));
      const optimistic = base.map((entry) =>
        entry.id === entryId ? { ...entry, balance: rounded } : entry,
      );
      setAllocationEntriesPatch(optimistic);
      saveCompletedManualAccounts(optimistic);
      syncManualEntriesToInputs(optimistic);
      onManualAccountsCommitted?.();
    },
    [
      allocationEntriesPatch,
      manualAccountEntries,
      onManualAccountsCommitted,
      syncManualEntriesToInputs,
    ],
  );

  const renderManualRowValuesControls = useCallback(
    (entry: ManualAccountEntry | undefined) => {
      if (
        !manualRowEditingEnabled ||
        !entry ||
        (entry.source ?? "manual") !== "manual"
      ) {
        return { allocation: null, total: null as ReactNode | null };
      }
      return {
        allocation: (
          <ManualAccountAllocationSlider
            entryId={entry.id}
            value={entry.allocation_profile}
            equityPct={entry.allocation_equity_pct}
            onChange={(profile, nextEquityPct) =>
              patchManualEntryAllocation(entry.id, profile, nextEquityPct)
            }
          />
        ),
        total: (
          <ManualAccountBalanceField
            balance={entry.balance}
            onCommit={(next) => patchManualEntryBalance(entry.id, next)}
          />
        ),
      };
    },
    [
      manualRowEditingEnabled,
      patchManualEntryAllocation,
      patchManualEntryBalance,
    ],
  );

  const onAccountScenarioOpen = useCallback(
    (bucket: AccountScenarioBucketId, initialTab?: ScenarioIntentTabId) => {
      setBalanceEditPanel(null);
      setBalanceEditClosing(false);
      openAccountScenario(bucket, initialTab);
    },
    [openAccountScenario],
  );

  const accountScenarioPanelTitle = useCallback(
    (bucket: AccountScenarioBucketId): string => {
      switch (bucket) {
        case "brokerage":
          return "Brokerage";
        case "pretax":
          return importedBucketLabel("pretax", "Pre-tax 401(k) / IRA");
        case "roth":
          return importedBucketLabel("roth", "Roth IRA");
        case "hsa":
          return importedBucketLabel("hsa", "HSA");
      }
    },
    [locale, taxConfig],
  );

  const buildAccountScenarioRowProps = useCallback(
    (
      bucket: AccountScenarioBucketId,
    ): PortfolioBucketAccountScenarioProps | null => {
      if (!accountScenarioEditingEnabled || !inputs) return null;
      const blended = blendedRateForAccountBucket(
        bucket,
        inputs.retRate,
        inputs.brkRate,
      );
      const stored = getAccountReturnScenario(inputs, bucket);
      const h = horizonClamp(c.yearsToRetirement);
      const choice = stored
        ? inferAccountScenarioUiChoice(stored, blended, h)
        : "default";
      const customDec =
        choice === "custom" && stored ? stored.flatRate : undefined;
      const active = accountScenarioIsActive(inputs, bucket);
      return {
        label: active
          ? scenarioColumnShortLabel(choice, customDec)
          : ACCOUNT_SCENARIO_PLACEHOLDER_LABEL,
        common: choice,
        variant: active ? "badge" : "outline",
        bucket,
        accountName: accountScenarioPanelTitle(bucket),
        triggerId: `account-scenario-trigger-${bucket}`,
      };
    },
    [
      accountScenarioEditingEnabled,
      accountScenarioPanelTitle,
      c.yearsToRetirement,
      inputs,
    ],
  );

  const isAccountScenarioRowActive = useCallback(
    (bucket: AccountScenarioBucketId) => isAccountScenarioOpen(bucket),
    [isAccountScenarioOpen],
  );

  const portfolioAccountGroupClassName = useCallback(
    (bucket: AccountScenarioBucketId, extra?: string) =>
      [
        "tax-treatment-disclosure",
        "portfolio-account-group",
        extra,
        isAccountScenarioRowActive(bucket) &&
          "portfolio-account-group--scenario-active",
      ]
        .filter(Boolean)
        .join(" "),
    [isAccountScenarioRowActive],
  );

  const reopenManageAfterDismiss = useCallback(() => {
    if (!hasAnyAccountCardData) {
      setOpenManageRequest((n) => n + 1);
    }
  }, [hasAnyAccountCardData]);

  const finalizeBalanceEditClose = useCallback(
    (options?: { closeManageMenu?: boolean }) => {
      setBalanceEditPanel(null);
      setBalanceEditClosing(false);
      setManualDraft(null);
      setManualConfirmPhase(false);
      setManualConfirmProgress(0);
      manualConfirmPendingRef.current = false;
      manualConfirmRunRef.current = false;
      pendingManualCommitRef.current = null;
      if (reopenManageAfterBalanceEditCloseRef.current) {
        reopenManageAfterBalanceEditCloseRef.current = false;
        reopenManageAfterDismiss();
      }
      if (options?.closeManageMenu && manageMenuOpenRef.current) {
        setManageOverlayPhase("method");
        setCloseManageRequest((n) => n + 1);
      }
    },
    [reopenManageAfterDismiss],
  );

  useEffect(() => {
    manageMenuOpenRef.current = manageMenuOpen;
  }, [manageMenuOpen]);

  const commitPendingManualPortfolio = useCallback(() => {
    const pending = pendingManualCommitRef.current;
    if (!pending || !onBases) return;
    const {
      allocations: _allocations,
      allocationEquityPct: _allocationEquityPct,
      ...bases
    } = pending.balances;
    saveManualAccountsFromBucketBases(
      bases,
      manualBucketAllocationsFromDraft(pending.balances),
      manualBucketEquityPctFromDraft(pending.balances),
    );
    onManualAccountsCommitted?.();
    onClearImportedForManual?.();
    onManualPortfolioPlanApplied?.(pending.plan);
    onBases(bases);
    onBalanceModeChange?.("manual");
    pendingManualCommitRef.current = null;
  }, [
    onBases,
    onBalanceModeChange,
    onClearImportedForManual,
    onManualAccountsCommitted,
    onManualPortfolioPlanApplied,
  ]);

  const requestBalanceEditClose = useCallback(() => {
    if (balanceEditPanel === "manual" && manualConfirmPhase === "plan") {
      setManualConfirmPhase(false);
      return;
    }
    if (!balanceEditPanel || balanceEditClosing || manualConfirmBusy) return;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (
      prefersReducedMotion &&
      (balanceEditPanel === "import" || balanceEditPanel === "manual")
    ) {
      if (balanceEditPanel === "manual" && manualConfirmPendingRef.current) {
        commitPendingManualPortfolio();
        markPortfolioBalancesFlush({ afterManualPlanModal: true });
        manualConfirmPendingRef.current = false;
        schedulePortfolioWaveReveal(MANUAL_PLAN_POST_FADE_PAUSE_MS);
      }
      finalizeBalanceEditClose({
        closeManageMenu:
          balanceEditPanel === "manual" && manualConfirmPendingRef.current,
      });
      return;
    }
    setBalanceEditClosing(true);
  }, [
    balanceEditPanel,
    balanceEditClosing,
    manualConfirmBusy,
    manualConfirmPhase,
    commitPendingManualPortfolio,
    finalizeBalanceEditClose,
  ]);

  const onBalanceEditSheetAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.animationName === "account-balances-manual-sheet-out") {
        if (!balanceEditClosing) return;
        if (manualConfirmPendingRef.current) {
          commitPendingManualPortfolio();
          markPortfolioBalancesFlush({ afterManualPlanModal: true });
          manualConfirmPendingRef.current = false;
          finalizeBalanceEditClose({ closeManageMenu: true });
          schedulePortfolioWaveReveal(
            MANUAL_PLAN_POST_FADE_PAUSE_MS + PORTFOLIO_REVEAL_START_DELAY_MS,
          );
          return;
        }
        finalizeBalanceEditClose({ closeManageMenu: true });
        return;
      }
      if (e.animationName !== "account-balances-import-sheet-out") {
        return;
      }
      if (!balanceEditClosing) return;
      finalizeBalanceEditClose({ closeManageMenu: true });
    },
    [
      balanceEditClosing,
      commitPendingManualPortfolio,
      finalizeBalanceEditClose,
    ],
  );

  const openBalanceEditPanel = useCallback(
    (panel: "manual" | "import") => {
      closeHoldingScenario();
      closeAccountScenario();
      setBalanceEditClosing(false);
      setManualConfirmPhase(false);
      setManualConfirmProgress(0);
      manualConfirmPendingRef.current = false;
      manualConfirmRunRef.current = false;
      pendingManualCommitRef.current = null;
      if (panel === "manual") {
        const base401k = inputs?.base401k ?? c.bal.bal401k;
        const baseSE401k = inputs?.baseSE401k ?? c.bal.balSE401k;
        const baseTradIRA = inputs?.baseTradIRA ?? c.bal.balTradIRA;
        const baseRoth = inputs?.baseRoth ?? c.bal.balRoth;
        const baseHsa = inputs?.baseHsa ?? c.bal.balHsa;
        const draftBrkBal = inputs?.brkBal ?? brkBal ?? 0;
        const storedEntries = loadStoredManualAccounts()?.entries;
        const allocSource =
          storedEntries && storedEntries.length > 0
            ? storedEntries
            : deriveManualAccountEntriesFromBalances(
                {
                  bal401k: base401k,
                  balSE401k: baseSE401k,
                  balTradIRA: baseTradIRA,
                  balRoth: baseRoth,
                  balHsa: baseHsa,
                },
                draftBrkBal,
              );
        setManualDraft({
          base401k,
          baseSE401k,
          baseTradIRA,
          baseRoth,
          baseHsa,
          brkBal: draftBrkBal,
          allocations: manualAllocationsFromEntries(allocSource),
          allocationEquityPct: manualEquityPctFromEntries(allocSource),
        });
      } else {
        setManualDraft(null);
      }
      setBalanceEditPanel(panel);
      if (panel === "import") {
        onBalanceModeChange?.("imported");
      }
    },
    [
      brkBal,
      c.bal.bal401k,
      c.bal.balHsa,
      c.bal.balRoth,
      c.bal.balSE401k,
      c.bal.balTradIRA,
      closeAccountScenario,
      closeHoldingScenario,
      inputs,
      onBalanceModeChange,
    ],
  );

  const lastOpenImportRequestRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!openImportRequest || !mergedDashboard || !onImportedApplyBalances)
      return;
    if (lastOpenImportRequestRef.current === openImportRequest) return;
    lastOpenImportRequestRef.current = openImportRequest;
    setOpenManageRequest((n) => n + 1);
    const frame = window.requestAnimationFrame(() => {
      onImportOpenHandled?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    openImportRequest,
    mergedDashboard,
    onImportedApplyBalances,
    onImportOpenHandled,
  ]);

  const queueManualCommitAfterBalances = useCallback(
    (plan: ManualPlanDraft) => {
      if (!manualDraft || balanceEditClosing) return;
      // Keep progress UI until the sheet finishes closing — avoids flashing manual rows.
      pendingManualCommitRef.current = { balances: manualDraft, plan };
      manualConfirmPendingRef.current = true;
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        commitPendingManualPortfolio();
        markPortfolioBalancesFlush({ afterManualPlanModal: true });
        manualConfirmPendingRef.current = false;
        finalizeBalanceEditClose({ closeManageMenu: true });
        schedulePortfolioWaveReveal(MANUAL_PLAN_POST_FADE_PAUSE_MS);
        return;
      }
      setManualConfirmPhase("progress");
      setManualConfirmProgress(100);
      setBalanceEditClosing(true);
    },
    [
      manualDraft,
      balanceEditClosing,
      commitPendingManualPortfolio,
      finalizeBalanceEditClose,
    ],
  );

  const runManualConfirmSequence = useCallback(async () => {
    if (!manualDraft || manualConfirmRunRef.current) return;
    manualConfirmRunRef.current = true;
    setManualConfirmPhase("progress");
    setManualConfirmProgress(10);

    await new Promise((r) => window.setTimeout(r, 140));
    setManualConfirmProgress(42);

    await new Promise((r) => window.setTimeout(r, 220));
    setManualConfirmProgress(78);

    await new Promise((r) => window.setTimeout(r, 200));
    setManualConfirmProgress(100);

    await new Promise((r) => window.setTimeout(r, 280));
    if (inputs && shouldSkipManualBalancesPlanStep(inputs)) {
      queueManualCommitAfterBalances(manualPlanDraftForCommit(inputs));
      manualConfirmRunRef.current = false;
      return;
    }
    setManualConfirmPhase("plan");
    manualConfirmRunRef.current = false;
  }, [manualDraft, inputs, queueManualCommitAfterBalances]);

  const completeManualPlanStep = useCallback(
    (plan: ManualPlanDraft) => {
      queueManualCommitAfterBalances(plan);
    },
    [queueManualCommitAfterBalances],
  );

  const confirmManualBalances = useCallback(() => {
    if (!manualDraft || manualConfirmBusy || balanceEditClosing) return;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      if (inputs && shouldSkipManualBalancesPlanStep(inputs)) {
        queueManualCommitAfterBalances(manualPlanDraftForCommit(inputs));
        return;
      }
      setManualConfirmPhase("plan");
      return;
    }
    void runManualConfirmSequence();
  }, [
    manualDraft,
    manualConfirmBusy,
    balanceEditClosing,
    inputs,
    queueManualCommitAfterBalances,
    runManualConfirmSequence,
  ]);

  const clearCsvImportLaunchUi = useCallback(() => {
    setCsvImportPrefillCustodian(null);
    setCsvFileIngestRequest(null);
    lastCsvReviewReadyIdRef.current = null;
  }, []);

  const finishCsvImportLaunch = useCallback(() => {
    clearCsvImportLaunchUi();
    setManageCsvPhaseHeader(null);
    setBalanceEditPanel((panel) => (panel === "import" ? null : panel));
    setBalanceEditClosing(false);
  }, [clearCsvImportLaunchUi]);

  const handleManageCsvPanelHeaderChange = useCallback(
    (header: { title: string; subtitle?: string; extra?: string }) => {
      setManageCsvPhaseHeader({
        title: header.title,
        subtitle: header.subtitle,
        extra: header.extra,
      });
    },
    [],
  );

  const onPickCsvCustodian = useCallback(
    (custodian: PositionsCsvCustodian) => {
      finishCsvImportLaunch();
      setManageOverlayPhase("method");
      financialsCsvPendingCustodianRef.current = custodian;
      financialsCsvFileInputRef.current?.click();
    },
    [finishCsvImportLaunch],
  );

  const handleCsvImportReviewReady = useCallback(() => {
    const id = csvFileIngestRequest?.id ?? null;
    if (id == null || lastCsvReviewReadyIdRef.current === id) return;
    lastCsvReviewReadyIdRef.current = id;
    setManageOverlayPhase("csv");
  }, [csvFileIngestRequest?.id]);

  const clearManageOverlayLeaveTimer = useCallback(() => {
    if (manageOverlayLeaveTimerRef.current != null) {
      clearTimeout(manageOverlayLeaveTimerRef.current);
      manageOverlayLeaveTimerRef.current = null;
    }
  }, []);

  const handleManageBackToMethod = useCallback(() => {
    clearManageOverlayLeaveTimer();
    const leaving = manageOverlayPhase === "method" ? null : manageOverlayPhase;
    if (leaving === "csv") {
      setManageOverlayLeavingPhase("csv");
    } else if (leaving === "manual") {
      setManageOverlayLeavingPhase("manual");
      setBalanceEditPanel(null);
      setBalanceEditClosing(false);
      setManualConfirmPhase(false);
      manualConfirmRunRef.current = false;
    }
    setManageOverlayPhase("method");
    if (leaving) {
      manageOverlayLeaveTimerRef.current = setTimeout(() => {
        if (leaving === "csv") finishCsvImportLaunch();
        setManageOverlayLeavingPhase(null);
        manageOverlayLeaveTimerRef.current = null;
      }, 250);
    }
  }, [clearManageOverlayLeaveTimer, finishCsvImportLaunch, manageOverlayPhase]);

  const manageOverlayLeavingPhaseRef = useRef(manageOverlayLeavingPhase);
  manageOverlayLeavingPhaseRef.current = manageOverlayLeavingPhase;

  useEffect(() => {
    if (manageOverlayPhase === "method") return;
    clearManageOverlayLeaveTimer();
    if (manageOverlayLeavingPhaseRef.current === "csv") {
      finishCsvImportLaunch();
    }
    setManageOverlayLeavingPhase(null);
  }, [clearManageOverlayLeaveTimer, finishCsvImportLaunch, manageOverlayPhase]);

  const manageMenuWasOpenRef = useRef(false);
  const prevHasAccountCardDataRef = useRef(hasAnyAccountCardData);
  const [showPostOnboardingImport, setShowPostOnboardingImport] =
    useState(false);

  useEffect(() => {
    const hadAccounts = prevHasAccountCardDataRef.current;
    prevHasAccountCardDataRef.current = hasAnyAccountCardData;

    if (!hasAnyAccountCardData) {
      const sessionActive =
        postOnboardingImportActive ||
        (typeof sessionStorage !== "undefined" &&
          sessionStorage.getItem("expectifi_post_onboarding_import") === "1");
      setShowPostOnboardingImport(sessionActive);
      return;
    }

    setShowPostOnboardingImport(false);
    clearPostOnboardingImportSession();

    // Close the required post-onboarding overlay once accounts are first added —
    // not on every render while the user already has saved accounts.
    if (!hadAccounts) {
      onImportOpenHandled?.();
      setCloseManageRequest((n) => n + 1);
    }
  }, [hasAnyAccountCardData, postOnboardingImportActive, onImportOpenHandled]);

  const handleManageOpenChange = useCallback(
    (open: boolean) => {
      const wasOpen = manageMenuWasOpenRef.current;
      manageMenuWasOpenRef.current = open;
      setManageMenuOpen(open);
      if (open) {
        if (!wasOpen) {
          setManageOverlayPhase("method");
        }
        return;
      }
      if (!open) {
        setManageOverlayPhase("method");
        if (csvFileIngestRequest) finishCsvImportLaunch();
        if (balanceEditPanel === "manual") finalizeBalanceEditClose();
      }
    },
    [
      balanceEditPanel,
      csvFileIngestRequest,
      finalizeBalanceEditClose,
      finishCsvImportLaunch,
    ],
  );

  const launchCsvImportFromFile = useCallback(
    (file: File, custodian: PositionsCsvCustodian) => {
      setCsvImportPrefillCustodian(custodian);
      setCsvFileIngestRequest({ id: Date.now(), file, custodian });
    },
    [],
  );

  const onFinancialsCsvFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      const custodian = financialsCsvPendingCustodianRef.current;
      if (!f || !custodian) return;
      financialsCsvPendingCustodianRef.current = null;
      launchCsvImportFromFile(f, custodian);
    },
    [launchCsvImportFromFile],
  );

  useEffect(() => {
    if (
      !holdingOpen &&
      !accountOpen &&
      !balanceEditPanel &&
      !removeAccountsModalState.isOpen
    )
      return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (manageMenuOpen) return;
      if (removeAccountsModalState.isOpen) removeAccountsModalState.close();
      else if (balanceEditPanel) requestBalanceEditClose();
      else if (accountOpen) closeAccountScenario();
      else if (holdingOpen) closeHoldingScenario();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    holdingOpen,
    accountOpen,
    balanceEditPanel,
    removeAccountsModalState.isOpen,
    removeAccountsModalState.close,
    closeHoldingScenario,
    closeAccountScenario,
    requestBalanceEditClose,
    manageMenuOpen,
  ]);

  const accountScenarioBundle = useMemo((): HoldingsScenarioBundle | null => {
    if (!accountScenarioEditingEnabled || !inputs || !setInputs) return null;
    return {
      inputs,
      setInputs,
      yearsToRetirement: c.yearsToRetirement,
      retirementCalendarYear: c.retirementCalendarYear,
      retRate: inputs.retRate,
      brkRate: inputs.brkRate,
    };
  }, [
    accountScenarioEditingEnabled,
    inputs,
    setInputs,
    c.yearsToRetirement,
    c.retirementCalendarYear,
  ]);

  const accountScenarioPopoutData = useMemo(() => {
    if (!accountScenarioBundle) return null;
    return {
      inputs: accountScenarioBundle.inputs,
      setInputs: accountScenarioBundle.setInputs,
      importedPositionRows,
      yearsToRetirement: accountScenarioBundle.yearsToRetirement,
      retirementCalendarYear: accountScenarioBundle.retirementCalendarYear,
      retRate: accountScenarioBundle.retRate,
      brkRate: accountScenarioBundle.brkRate,
      accountNameForBucket: accountScenarioPanelTitle,
    };
  }, [accountScenarioBundle, accountScenarioPanelTitle, importedPositionRows]);

  const holdingsScenarioBundle = holdingsScenarioEditingEnabled
    ? accountScenarioBundle
    : null;

  const showWithdrawalGuidance =
    phase === "income" &&
    readOnly &&
    !configureInputsOnly &&
    hasAnyAccountCardData &&
    (mergedDashboard ||
      (displayBalanceMode === "imported" && hasAnyImportedRetirement));

  const incomeModeAccountRows =
    phase === "income" && mergedDashboard && readOnly;

  const presentWithdrawalBuckets = useMemo((): WithdrawalDisplayBucket[] => {
    const buckets = new Set<WithdrawalDisplayBucket>();
    if (displayBalanceMode === "manual" && manualAccountEntries.length > 0) {
      for (const entry of manualAccountEntries) {
        if (entry.type == null || entry.balance <= 0) continue;
        buckets.add(getAccountTypeMeta(entry.type, locale).withdrawalBucket);
      }
    } else {
      const pretaxTotal = retirementPretaxDisplayTotal(c.bal);
      if (pretaxTotal > 0) buckets.add("pretax");
      if (c.bal.balRoth > 0) buckets.add("roth");
      if (c.bal.balHsa > 0) buckets.add("hsa");
      if ((brkBal ?? 0) > 0 || hasImportedBrokerage) buckets.add("brokerage");
    }
    return withdrawalBucketOrder(retirementAge, true, locale).filter(
      (b) => buckets.has(b) && localeSupportsWithdrawalBucket(locale, b),
    );
  }, [
    balanceMode,
    manualAccountEntries,
    c.bal.bal401k,
    c.bal.balSE401k,
    c.bal.balTradIRA,
    c.bal.balRoth,
    c.bal.balHsa,
    brkBal,
    hasImportedBrokerage,
    retirementAge,
    locale,
  ]);

  const userAccountTypes = useMemo((): OnboardingAccountType[] => {
    if (displayBalanceMode === "manual") {
      const types = manualAccountEntries
        .map((e) => e.type)
        .filter((t): t is OnboardingAccountType => t != null);
      return [...new Set(types)];
    }
    const types: OnboardingAccountType[] = [];
    if (presentWithdrawalBuckets.includes("brokerage")) types.push("brokerage");
    if (presentWithdrawalBuckets.includes("pretax"))
      types.push("pretax_401k_ira");
    if (presentWithdrawalBuckets.includes("roth")) types.push("roth_ira");
    if (presentWithdrawalBuckets.includes("hsa")) types.push("hsa");
    return types;
  }, [displayBalanceMode, manualAccountEntries, presentWithdrawalBuckets]);

  const showPersonalizedBucketHints =
    readOnly && !configureInputsOnly && hasAnyAccountCardData;

  const renderBucketSubtext = useCallback(
    (bucket: AccountScenarioBucketId, balance: number): ReactNode | null => {
      if (!showPersonalizedBucketHints) return null;
      const segments = resolveBucketRowHint({
        bucket,
        balance,
        totalPortfolio: portfolioTotal,
        locale,
        mode: phase,
        c,
        inputs,
        userAccountTypes,
        presentBuckets: presentWithdrawalBuckets,
        brkBal: brkBal ?? 0,
      });
      if (!segments?.length) return null;
      return (
        <AccountBucketHint
          segments={segments}
          onScenarioAction={(action) =>
            onAccountScenarioOpen(action.bucket, action.tab)
          }
          onSocialSecurityAction={() => onOpenSocialSecurity?.()}
        />
      );
    },
    [
      showPersonalizedBucketHints,
      portfolioTotal,
      locale,
      phase,
      c,
      inputs,
      userAccountTypes,
      presentWithdrawalBuckets,
      brkBal,
      onAccountScenarioOpen,
      onOpenSocialSecurity,
    ],
  );

  const renderWithdrawalPill = useCallback(
    (bucket: AccountScenarioBucketId): ReactNode | null => {
      if (phase !== "income" || !showPersonalizedBucketHints) return null;
      const annual = annualWithdrawalForAccountBucket(bucket, c);
      if (annual == null) return null;
      return <AccountBucketWithdrawalPill annualWithdrawal={annual} />;
    },
    [phase, showPersonalizedBucketHints, c],
  );

  const showBalanceEntryActions = mergedDashboard
    ? canEditBalances
    : !readOnly && Boolean(onBalanceModeChange);

  function bucketBaseKey(
    key: BucketKey,
  ): Exclude<keyof ManualBalancesDraft, "allocations" | "allocationEquityPct"> {
    return BUCKET_BASE_FIELD[key];
  }

  function setBase(key: BucketKey, displayVal: string) {
    if (!onBases) return;
    const v = parseNum(displayVal);
    onBases({ [bucketBaseKey(key)]: Math.max(0, v) } as Parameters<
      NonNullable<typeof onBases>
    >[0]);
  }

  function setManualDraftBase(key: BucketKey, displayVal: string) {
    const v = Math.max(0, parseNum(displayVal));
    const baseKey = bucketBaseKey(key);
    setManualDraft((prev) => (prev ? { ...prev, [baseKey]: v } : prev));
  }

  function setManualDraftAllocation(
    key: BucketKey,
    profile: AllocationProfile,
    equityPct: number,
  ) {
    setManualDraft((prev) =>
      prev
        ? {
            ...prev,
            allocations: { ...prev.allocations, [key]: profile },
            allocationEquityPct: {
              ...prev.allocationEquityPct,
              [key]: equityPct,
            },
          }
        : prev,
    );
  }

  function displayManualDraftAllocation(
    key: BucketKey,
  ): AllocationProfile | null | undefined {
    return manualDraft?.allocations?.[key];
  }

  function displayManualDraftEquityPct(
    key: BucketKey,
  ): number | null | undefined {
    return manualDraft?.allocationEquityPct?.[key];
  }

  function displayManualDraft(key: BucketKey): number {
    if (!manualDraft) return display(key);
    return manualDraft[bucketBaseKey(key)];
  }

  const manualBalanceRows: ManualBalanceRow[] = [
    {
      key: "ret401k",
      label: "Existing 401k",
      taxKind: "Traditional",
      taxDesc: "Contributed pre-tax, taxed on withdrawal",
      tone: "trad",
    },
    {
      key: "se401k",
      label: "Self-Employed 401k",
      taxKind: "Traditional",
      taxDesc: "Contributed pre-tax, taxed on withdrawal",
      tone: "trad",
    },
    {
      key: "tradIra",
      label: "Traditional IRA",
      taxKind: "Traditional",
      taxDesc: "Contributed pre-tax, taxed on withdrawal",
      tone: "trad",
    },
    {
      key: "roth",
      label: "Roth IRA",
      taxKind: "Tax-free growth",
      taxDesc: "Contributed after-tax, withdrawals tax-free",
      tone: "roth",
    },
    {
      key: "hsa",
      label: "HSA",
      taxKind: "Triple tax-advantaged",
      taxDesc: "Pre-tax in, tax-free growth, tax-free for medical",
      tone: "hsa",
    },
    {
      key: "brokerage",
      label: "Brokerage",
      taxKind: "Taxable",
      taxDesc: "No special shelter; dividends and realized gains are taxable.",
      tone: "taxable",
    },
  ];

  const display = (key: BucketKey) => {
    switch (key) {
      case "ret401k":
        return c.bal.bal401k;
      case "se401k":
        return c.bal.balSE401k;
      case "tradIra":
        return c.bal.balTradIRA;
      case "roth":
        return c.bal.balRoth;
      case "hsa":
        return c.bal.balHsa;
      case "brokerage":
        return brkBal ?? 0;
    }
  };

  const manualRetirementRows = manualBalanceRows.filter(
    (r) => r.key !== "brokerage",
  );

  function manualRowHasBalance(row: ManualBalanceRow): boolean {
    return display(row.key) > 0;
  }

  function visibleManualRetirementRows(): ManualBalanceRow[] {
    return manualRetirementRows.filter(manualRowHasBalance);
  }

  function setMode(m: BalanceInputMode) {
    onBalanceModeChange?.(m);
  }

  const csvImportModalOpen = Boolean(
    mergedDashboard && csvFileIngestRequest && onImportedApplyBalances,
  );

  const enterManageManualPhase = useCallback(() => {
    finishCsvImportLaunch();
    if (!manualDraft) {
      openBalanceEditPanel("manual");
    } else {
      setBalanceEditPanel("manual");
      setBalanceEditClosing(false);
      setManualConfirmPhase(false);
      setManualConfirmProgress(0);
      manualConfirmPendingRef.current = false;
      manualConfirmRunRef.current = false;
      pendingManualCommitRef.current = null;
    }
    setManageOverlayPhase("manual");
  }, [finishCsvImportLaunch, manualDraft, openBalanceEditPanel]);

  function renderReplaceSourceConfirmOverlay(
    stackedOnImportModal = false,
    stackedOnManageMenu = false,
  ) {
    if (!replaceSourceConfirm) return null;

    const overlay = (
      <div
        className={[
          "account-balances-remove-overlay",
          stackedOnImportModal &&
            !stackedOnManageMenu &&
            "account-balances-remove-overlay--on-import-modal",
          stackedOnManageMenu &&
            "account-balances-remove-overlay--on-manage-menu",
          replaceSourceConfirmClosing &&
            "account-balances-remove-overlay--closing",
        ]
          .filter(Boolean)
          .join(" ")}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="account-balances-replace-source-title"
        aria-describedby="account-balances-replace-source-desc"
        onAnimationEnd={onReplaceSourceConfirmOverlayAnimationEnd}
      >
        <button
          type="button"
          className="account-balances-remove-overlay__backdrop"
          aria-label="Cancel"
          disabled={replaceSourceConfirmClosing}
          onClick={requestReplaceSourceConfirmClose}
        />
        <div className="account-balances-remove-overlay__panel">
          <h2
            id="account-balances-replace-source-title"
            className="account-balances-remove-overlay__title"
          >
            Replace current balances?
          </h2>
          <p
            id="account-balances-replace-source-desc"
            className="account-balances-remove-overlay__body"
          >
            {replaceSourceConfirm.message}
          </p>
          <div className="account-balances-remove-overlay__footer">
            <AppButton
              variant="secondary"
              size="sm"
              className="account-balances-remove-overlay__btn"
              isDisabled={replaceSourceConfirmClosing}
              onPress={requestReplaceSourceConfirmClose}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              className="account-balances-remove-overlay__btn"
              isDisabled={replaceSourceConfirmClosing}
              onPress={() => {
                const proceed = replaceSourceConfirm.proceed;
                proceed();
                setReplaceSourceConfirmClosing(false);
                setReplaceSourceConfirm(null);
              }}
            >
              Continue
            </AppButton>
          </div>
        </div>
      </div>
    );

    if (
      stackedOnImportModal &&
      !stackedOnManageMenu &&
      typeof document !== "undefined"
    ) {
      return createPortal(overlay, document.body);
    }

    return overlay;
  }

  function renderRemoveAccountsConfirmOverlay(stackedOnManageMenu = false) {
    if (!onRemoveRetirementAccounts || !removeAccountsModalState.isOpen)
      return null;

    return (
      <div
        className={[
          "account-balances-remove-overlay",
          stackedOnManageMenu &&
            "account-balances-remove-overlay--on-manage-menu",
        ]
          .filter(Boolean)
          .join(" ")}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="account-balances-remove-title"
        aria-describedby="account-balances-remove-desc"
      >
        <button
          type="button"
          className="account-balances-remove-overlay__backdrop"
          aria-label="Dismiss"
          onClick={() => removeAccountsModalState.close()}
        />
        <div className="account-balances-remove-overlay__panel">
          <h2
            id="account-balances-remove-title"
            className="account-balances-remove-overlay__title"
          >
            Remove all accounts?
          </h2>
          <p
            id="account-balances-remove-desc"
            className="account-balances-remove-overlay__body"
          >
            {REMOVE_ACCOUNTS_CONFIRM_BODY}
          </p>
          <div className="account-balances-remove-overlay__footer">
            <AppButton
              variant="secondary"
              size="sm"
              className="account-balances-remove-overlay__btn"
              onPress={() => removeAccountsModalState.close()}
            >
              Cancel
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              className="account-balances-remove-modal-confirm account-balances-remove-overlay__btn"
              onPress={confirmRemoveAccounts}
            >
              Remove
            </AppButton>
          </div>
        </div>
      </div>
    );
  }

  function renderHiddenCsvFileInput() {
    if (!mergedDashboard || !canEditBalances) return null;
    return (
      <input
        ref={financialsCsvFileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onFinancialsCsvFileChange}
      />
    );
  }

  useEffect(() => {
    if (!mergedDashboard || !canEditBalances) return;
    const hadData = hadAccountCardDataRef.current;
    hadAccountCardDataRef.current = hasAnyAccountCardData;
    if (hadData && !hasAnyAccountCardData) {
      setOpenManageRequest((n) => n + 1);
    }
  }, [mergedDashboard, canEditBalances, hasAnyAccountCardData]);

  function renderManageCsvPanel() {
    if (!csvFileIngestRequest || !onImportedApplyBalances) return null;
    return (
      <PositionsCsvImport
        presentation="panel"
        open
        hideTrigger
        hideCancelButton
        hidePanelHeader
        onPanelHeaderChange={handleManageCsvPanelHeaderChange}
        initialCustodian={csvImportPrefillCustodian}
        fileIngestRequest={csvFileIngestRequest}
        onImportReviewReady={handleCsvImportReviewReady}
        onImportFlowClose={handleManageBackToMethod}
        onApplyBalances={onImportedApplyBalances}
        onImportApplied={() => {
          onBalanceModeChange?.("imported");
          onPositionsImportApplied?.();
          finishCsvImportLaunch();
          setManageOverlayPhase("method");
          setCloseManageRequest((n) => n + 1);
        }}
        showManualReplaceNotice={willRemoveManualOnConnect}
      />
    );
  }

  function resolveManagePhaseHeader(): ManageOverlayPhaseHeader | null {
    if (
      manageOverlayPhase === "manual" ||
      manageOverlayLeavingPhase === "manual"
    ) {
      if (manualConfirmPhase === "plan") {
        return {
          title: "Your Plans",
          subtitle:
            "We need a few details to project growth and monthly income from your balances.",
        };
      }
      if (manualConfirmPhase === "progress") {
        return { title: "Saving balances" };
      }
      return {
        title: "Manual balances",
        subtitle: "You can can refine these later.",
      };
    }
    if (manageOverlayPhase === "csv" || manageOverlayLeavingPhase === "csv") {
      return manageCsvPhaseHeader;
    }
    return null;
  }

  function renderManualBalancesBodyContent() {
    return (
      <div className="account-balances-edit-sheet__body">
        {manualConfirmPhase === "progress" ? (
          <div
            className="account-balances-manual-confirm-progress"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <p className="account-balances-manual-confirm-progress__label">
              Saving your balances…
            </p>
            <div
              className="account-balances-manual-confirm-progress__track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={manualConfirmProgress}
            >
              <div
                className="account-balances-manual-confirm-progress__fill"
                style={{ width: `${manualConfirmProgress}%` }}
              />
            </div>
          </div>
        ) : manualConfirmPhase === "plan" && inputs ? (
          <ManualBalancesPlanStep
            key={inputsHavePlanningProfileFields(inputs) ? "captured" : "empty"}
            initialDateOfBirth={planningDisplayFromInputs(inputs).dateOfBirth}
            initialTargetRetirementAge={
              planningDisplayFromInputs(inputs).targetRetirementAge
            }
            initialSave={planningDisplayFromInputs(inputs).save}
            onContinue={completeManualPlanStep}
            onCancel={() => setManualConfirmPhase(false)}
          />
        ) : (
          manualBalanceRows.map((row, idx) =>
            renderManualBalanceEditRow(row, idx, {
              useDraft: true,
              omitLastBorder: true,
            }),
          )
        )}
      </div>
    );
  }

  function renderManualBalancesPanelContent(options: { embedded: boolean }) {
    const { embedded } = options;
    const panelHost = (
      <div
        className={[
          "account-balances-manual-panel-host",
          embedded && "account-balances-manual-panel-host--embedded",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {!embedded ? (
          <header className="account-balances-edit-sheet__head">
            <div className="account-balances-edit-sheet__head-text">
              <h2
                className="account-balances-edit-sheet__title"
                id="account-balances-manual-title"
              >
                {manualConfirmPhase === "plan"
                  ? "Your Plans"
                  : manualConfirmPhase === "progress"
                    ? "Saving balances"
                    : "Manual balances"}
              </h2>
              {manualConfirmPhase === "plan" ? (
                <p className="account-balances-edit-sheet__subtitle">
                  We need a few details to project growth and monthly income
                  from your balances.
                </p>
              ) : manualConfirmPhase === false ? (
                <p className="account-balances-edit-sheet__hint">
                  Ballpark amounts are fine, since you can refine them later.
                </p>
              ) : null}
            </div>
          </header>
        ) : null}
        {embedded ? (
          <AppOverlayScrollbars
            className="account-balances-manage__phase-scroll side-panel-shell__scroll"
            defer={false}
          >
            {renderManualBalancesBodyContent()}
          </AppOverlayScrollbars>
        ) : (
          renderManualBalancesBodyContent()
        )}
        {manualConfirmPhase === false ? (
          <footer className="account-balances-edit-sheet__foot account-balances-edit-sheet__foot--manual-confirm">
            <div className="account-balances-manual-sheet__footer-row account-balances-manual-sheet__footer-row--confirm-only">
              <AppButton
                size="sm"
                variant="primary"
                isDisabled={balanceEditClosing}
                onPress={confirmManualBalances}
              >
                Confirm
              </AppButton>
            </div>
          </footer>
        ) : null}
      </div>
    );

    if (!embedded) return panelHost;

    return (
      <div
        className={[
          "account-balances-manage__manual-embedded",
          balanceEditClosing && "account-balances-manual-sheet--closing",
        ]
          .filter(Boolean)
          .join(" ")}
        onAnimationEnd={onBalanceEditSheetAnimationEnd}
      >
        {panelHost}
      </div>
    );
  }

  function renderAccountBalancesManageMenu(options?: {
    hideTrigger?: boolean;
    initialOpen?: boolean;
    requiredEntry?: boolean;
    postOnboardingImport?: boolean;
  }) {
    if (!showBalanceEntryActions) return null;
    const removeConfirmOpen =
      Boolean(onRemoveRetirementAccounts) && removeAccountsModalState.isOpen;
    const replaceConfirmOpen = Boolean(replaceSourceConfirm);
    const stackedOverlay =
      removeConfirmOpen || replaceConfirmOpen ? (
        <>
          {removeConfirmOpen ? renderRemoveAccountsConfirmOverlay(true) : null}
          {replaceConfirmOpen
            ? renderReplaceSourceConfirmOverlay(false, true)
            : null}
        </>
      ) : null;
    return (
      <>
        <AccountBalancesManageMenu
          hideTrigger={options?.hideTrigger}
          initialOpen={options?.initialOpen}
          requiredEntry={options?.requiredEntry}
          postOnboardingImport={options?.postOnboardingImport}
          onPostOnboardingCancel={onPostOnboardingImportCancel}
          canClearAccounts={Boolean(
            hasAnyAccountCardData && onRemoveRetirementAccounts,
          )}
          manualReplaceNotice={null}
          onRequestReplaceManual={guardReplaceManual}
          onRequestReplaceImport={guardReplaceImport}
          onManualAdd={() =>
            mergedDashboard ? enterManageManualPhase() : setMode("manual")
          }
          onPickCsvCustodian={onPickCsvCustodian}
          onClearAccounts={() => removeAccountsModalState.open()}
          openRequest={openManageRequest}
          closeRequest={closeManageRequest}
          overlayPhase={mergedDashboard ? manageOverlayPhase : "method"}
          exitingOverlayPhase={
            mergedDashboard ? manageOverlayLeavingPhase : null
          }
          onBackToMethod={handleManageBackToMethod}
          phaseHeader={resolveManagePhaseHeader()}
          manualPanel={
            mergedDashboard &&
            (manageOverlayPhase === "manual" ||
              manageOverlayLeavingPhase === "manual")
              ? renderManualBalancesPanelContent({ embedded: true })
              : null
          }
          csvIngestActive={Boolean(mergedDashboard && csvFileIngestRequest)}
          csvPanel={
            mergedDashboard &&
            csvFileIngestRequest &&
            (manageOverlayPhase === "csv" ||
              manageOverlayLeavingPhase === "csv" ||
              (manageOverlayPhase === "method" && !manageOverlayLeavingPhase))
              ? renderManageCsvPanel()
              : null
          }
          csvFileInput={mergedDashboard ? renderHiddenCsvFileInput() : null}
          onOpenUpgrade={onOpenUpgradeCsv}
          onManageOpenChange={handleManageOpenChange}
          removeConfirmOpen={removeConfirmOpen}
          onRemoveConfirmClose={() => removeAccountsModalState.close()}
          replaceConfirmOpen={replaceConfirmOpen}
          onReplaceConfirmClose={requestReplaceSourceConfirmClose}
          stackedOverlay={stackedOverlay}
          onImportApplied={() => {
            onBalanceModeChange?.("imported");
            onPositionsImportApplied?.();
            finishCsvImportLaunch();
          }}
        />
      </>
    );
  }

  function metaFor(bucket: WithdrawalDisplayBucket) {
    return withdrawalBadgeAndHint(
      bucket,
      retirementAge,
      true,
      presentWithdrawalBuckets,
      locale,
    );
  }

  function importedBucketLabel(
    bucket: WithdrawalDisplayBucket,
    fallback: string,
  ): string {
    return accountLabelForWithdrawalBucket(taxConfig, bucket) ?? fallback;
  }

  function renderAccountProjectedValue(
    bucket: AccountScenarioBucketId,
    startingBalance: number,
  ): ReactNode {
    if (!showGrowthBars || !(startingBalance > 0) || !inputs) return null;

    const rate = accountGrowthScenarioRate(
      "base",
      bucket,
      inputs.retRate,
      brkRate ?? inputs.brkRate,
      c.yearsToRetirement,
      inputs,
    );
    const data = buildAccountGrowthBarData(
      startingBalance,
      rate,
      c.yearsToRetirement,
      c.currentAge,
      ACCOUNT_GROWTH_COLORS[bucket],
    );
    if (!data) return null;
    return (
      <span className="portfolio-bucket-account-row__projected tabular-nums">
        +&nbsp;{formatGrowthBarValue(data.projectedFinal)}
      </span>
    );
  }

  function renderManualPortfolioAccountCard(
    key: string,
    opts: {
      label: string;
      bucket: AccountScenarioBucketId;
      total: number;
      withdrawalUi: boolean;
      manualEntry?: ManualAccountEntry;
    },
  ) {
    const { label, bucket, total, withdrawalUi, manualEntry } = opts;
    const entryForAllocation =
      manualEntry ??
      (displayBalanceMode === "manual"
        ? manualAccountEntryForBucket(manualAccountEntries, bucket, locale)
        : undefined);
    const { order } = withdrawalUi
      ? metaFor(bucket)
      : { order: null as number | null };
    const subtext = renderBucketSubtext(
      bucket,
      entryForAllocation?.balance ?? total,
    );
    const scenario = buildAccountScenarioRowProps(bucket);
    const rowValues = renderManualRowValuesControls(entryForAllocation);
    const displayTotal =
      rowValues.total ?? fmt(entryForAllocation?.balance ?? total);
    const startingBalance = entryForAllocation?.balance ?? total;

    return (
      <div
        key={key}
        className={portfolioAccountGroupClassName(
          bucket,
          "portfolio-account-group--static",
        )}
        data-manual-account-entry={entryForAllocation?.id}
      >
        <div className="portfolio-bucket-account-summary">
          <PortfolioBucketAccountRow
            amountBesideScenario
            badgeOrder={withdrawalUi ? order : null}
            label={label}
            subtext={subtext}
            allocationSlot={rowValues.allocation}
            withdrawalPill={renderWithdrawalPill(bucket)}
            total={displayTotal}
            showViewHoldings={false}
            scenario={scenario}
            valuesExtra={renderAccountProjectedValue(bucket, startingBalance)}
          />
        </div>
      </div>
    );
  }

  function renderImportedTaxDisclosure(
    tax: "pretax" | "roth" | "hsa",
    def: { label: string; total: number },
    withdrawalUi: boolean,
  ) {
    const bucket: WithdrawalDisplayBucket = tax;
    const accountBucket: AccountScenarioBucketId = tax;
    const accountScenario = buildAccountScenarioRowProps(accountBucket);
    const taxSubtext = renderBucketSubtext(accountBucket, def.total);
    const { order } = withdrawalUi
      ? metaFor(bucket)
      : { order: null as number | null };
    const positions = positionsForTaxTreatment(importedPositionRows, tax);
    const trend = computeBucketTrendDisplay(positions);
    const aggregated = aggregatePositionsBySymbol(positions);

    const summaryInner = (
      <PortfolioBucketAccountRow
        amountBesideScenario
        badgeOrder={withdrawalUi ? order : null}
        label={def.label}
        subtext={taxSubtext}
        withdrawalPill={renderWithdrawalPill(accountBucket)}
        total={fmt(def.total)}
        trend={trend}
        scenario={accountScenario}
        valuesExtra={renderAccountProjectedValue(accountBucket, def.total)}
      />
    );

    return (
      <details
        key={tax}
        className={portfolioAccountGroupClassName(accountBucket)}
      >
        <summary className="tax-treatment-disclosure__summary portfolio-bucket-account-summary">
          {summaryInner}
        </summary>
        <div className="tax-treatment-disclosure__body tax-treatment-disclosure__body--import-style">
          {!positions.length ? (
            <p className="footnote tax-treatment-disclosure__empty">
              No positions mapped to this bucket in your import.
            </p>
          ) : (
            <AggregatedHoldingsTable
              rows={aggregated}
              importedPositionRows={importedPositionRows}
              scenarioBundle={holdingsScenarioBundle}
              accountScenarioBucket={accountBucket}
            />
          )}
        </div>
      </details>
    );
  }

  function renderImportedTaxBuckets(withdrawalUi: boolean) {
    const pretaxTotal = retirementPretaxDisplayTotal(c.bal);
    const defs = (
      [
        {
          tax: "pretax" as const,
          label: importedBucketLabel("pretax", "Pre-tax"),
          total: pretaxTotal,
        },
        {
          tax: "roth" as const,
          label: importedBucketLabel("roth", "Tax-advantaged"),
          total: c.bal.balRoth,
        },
        {
          tax: "hsa" as const,
          label: importedBucketLabel("hsa", "HSA"),
          total: c.bal.balHsa,
        },
      ] as const
    ).filter(
      (d) => d.total > 0 && localeSupportsWithdrawalBucket(locale, d.tax),
    );
    const defByTax = Object.fromEntries(defs.map((d) => [d.tax, d])) as Partial<
      Record<"pretax" | "roth" | "hsa", (typeof defs)[0]>
    >;

    if (withdrawalUi) {
      const seq = withdrawalBucketOrder(retirementAge, false, locale);
      return seq.flatMap((b) => {
        if (b === "brokerage") return [];
        const def = defByTax[b];
        if (!def) return [];
        return [renderImportedTaxDisclosure(b, def, true)];
      });
    }

    return defs.map((d) => renderImportedTaxDisclosure(d.tax, d, false));
  }

  function renderManualBalanceEditRow(
    row: ManualBalanceRow,
    idx: number,
    opts: { readOnly?: boolean; useDraft?: boolean; omitLastBorder?: boolean },
  ) {
    const { key, label, taxKind, taxDesc, tone } = row;
    const omitDivider =
      opts.omitLastBorder && idx === manualBalanceRows.length - 1;
    const amount = opts.useDraft ? displayManualDraft(key) : display(key);

    const stackedOverlayDraft = Boolean(opts.useDraft && mergedDashboard);

    return (
      <div
        key={key}
        className={[
          "edit-row",
          "edit-row--manual-balance",
          stackedOverlayDraft ? "edit-row--manual-balance--stacked" : "",
          omitDivider ? "edit-row--no-divider" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-manual-account-entry={manualEntryIdForAccountType(
          BUCKET_ACCOUNT_TYPE[key],
        )}
      >
        <div className="manual-balance-row__head">
          <ManualBalanceRowLabel
            label={label}
            taxKind={taxKind}
            taxDesc={taxDesc}
            tone={tone}
          />
          <div className="edit-row-right">
            {opts.readOnly ? (
              <span
                style={{
                  fontFamily: "var(--heading)",
                  fontSize: "var(--text-base)",
                  fontWeight: 500,
                }}
              >
                {fmt(amount)}
              </span>
            ) : (
              <div className="num-input-wrap">
                <span className="num-input-prefix">{currencySymbol()}</span>
                <input
                  type="text"
                  className="num-input"
                  value={fmtInput(amount)}
                  onChange={(e) =>
                    opts.useDraft
                      ? setManualDraftBase(key, e.target.value)
                      : setBase(key, e.target.value)
                  }
                />
              </div>
            )}
          </div>
        </div>
        {stackedOverlayDraft ? (
          <ManualAccountAllocationSlider
            entryId={manualEntryIdForAccountType(BUCKET_ACCOUNT_TYPE[key])}
            className="account-balances-manual-overlay__allocation"
            value={displayManualDraftAllocation(key)}
            equityPct={displayManualDraftEquityPct(key)}
            onChange={(profile, nextEquityPct) =>
              setManualDraftAllocation(key, profile, nextEquityPct)
            }
          />
        ) : null}
      </div>
    );
  }

  function renderBalanceRows() {
    if (!hasRetirementAccountData) {
      return null;
    }

    if (readOnly) {
      if (displayBalanceMode === "manual") {
        const rows = visibleManualRetirementRows();
        return rows.map((row, idx) =>
          renderManualBalanceEditRow(row, idx, {
            readOnly: true,
            omitLastBorder: !mergedDashboard && idx === rows.length - 1,
          }),
        );
      }
      return renderImportedTaxBuckets(
        showWithdrawalGuidance && !mergedDashboard,
      );
    }

    if (configureInputsOnly) {
      if (displayBalanceMode === "manual") {
        return manualBalanceRows.map((row, idx) =>
          renderManualBalanceEditRow(row, idx, { omitLastBorder: true }),
        );
      }
      if (hasAnyImportedRetirement) {
        return (
          <p
            className="footnote"
            style={{
              marginTop: "var(--space-2)",
              marginBottom: "var(--space-2)",
              border: "none",
              padding: 0,
            }}
          >
            Apply balances from your import to update the model. Per-account
            totals and holdings are shown on the main dashboard only—not in this
            panel.
          </p>
        );
      }
      return null;
    }

    if (displayBalanceMode === "manual") {
      return manualBalanceRows.map((row, idx) =>
        renderManualBalanceEditRow(row, idx, { omitLastBorder: true }),
      );
    }
    return renderImportedTaxBuckets(false);
  }

  function renderMergedBrokerageBlock(withdrawalUi: boolean) {
    if (
      !mergedDashboard ||
      !hasBrokerageAccountData ||
      brkBal == null ||
      brkRate == null
    ) {
      return null;
    }

    const brkMeta = withdrawalUi
      ? metaFor("brokerage")
      : { order: null as number | null };
    const brkTrend = computeBucketTrendDisplay(brokeragePositions);
    const brokerageScenario = buildAccountScenarioRowProps("brokerage");
    const brokerageSubtext = renderBucketSubtext("brokerage", brkBal);

    if (!useImportedBrokerageView) {
      const brokerageEntry =
        displayBalanceMode === "manual"
          ? manualAccountEntryForBucket(
              manualAccountEntries,
              "brokerage",
              locale,
            )
          : undefined;
      return renderManualPortfolioAccountCard("brokerage", {
        label: brokerageEntry
          ? getAccountTypeMeta(brokerageEntry.type!, locale).label
          : "Brokerage",
        bucket: "brokerage",
        total: brkBal,
        withdrawalUi,
        manualEntry: brokerageEntry,
      });
    }

    const summaryInner = (
      <PortfolioBucketAccountRow
        amountBesideScenario
        badgeOrder={withdrawalUi ? brkMeta.order : null}
        label="Brokerage"
        subtext={brokerageSubtext}
        withdrawalPill={renderWithdrawalPill("brokerage")}
        total={fmt(brkBal)}
        trend={brkTrend}
        scenario={brokerageScenario}
        valuesExtra={renderAccountProjectedValue("brokerage", brkBal)}
      />
    );

    const brkAggregated = aggregatePositionsBySymbol(brokeragePositions);

    return (
      <details
        key="brokerage"
        className={portfolioAccountGroupClassName("brokerage")}
      >
        <summary className="tax-treatment-disclosure__summary portfolio-bucket-account-summary">
          {summaryInner}
        </summary>
        <div className="tax-treatment-disclosure__body tax-treatment-disclosure__body--import-style">
          <AggregatedHoldingsTable
            rows={brkAggregated}
            importedPositionRows={importedPositionRows}
            scenarioBundle={holdingsScenarioBundle}
            accountScenarioBucket="brokerage"
          />
        </div>
      </details>
    );
  }

  const manualEntryBucketTotals = useMemo(() => {
    const totals: Partial<Record<AccountScenarioBucketId, number>> = {};
    for (const entry of manualAccountEntries) {
      if (entry.type == null || entry.balance <= 0) continue;
      const bucket = getAccountTypeMeta(entry.type, locale).withdrawalBucket;
      totals[bucket] = (totals[bucket] ?? 0) + entry.balance;
    }
    return totals;
  }, [manualAccountEntries, locale]);

  const resolveIncomeRowRetirementBalance = useCallback(
    (
      bucket: AccountScenarioBucketId,
      currentBalance: number,
      bucketCurrentTotal?: number,
    ) => {
      const line = {
        storageKey: "",
        bucket,
        currentBalance,
        bucketCurrentTotal:
          bucketCurrentTotal ??
          currentBalanceForAccountBucket(bucket, c, brkBal ?? 0),
      };
      return incomeBalanceForProjection(line, c, brkBal ?? 0);
    },
    [c, brkBal],
  );

  const renderIncomeAccountRow = useCallback(
    (
      storageKey: string,
      label: string,
      bucket: AccountScenarioBucketId,
      currentBalance: number,
      bucketCurrentTotal?: number,
      badgeOrder: number | null = null,
    ) => {
      const ticker = resolveAccountIncomeFundTicker(
        storageKey,
        bucket,
        accountIncomeFunds,
      );
      const balanceAtRetirement = resolveIncomeRowRetirementBalance(
        bucket,
        currentBalance,
        bucketCurrentTotal,
      );
      const strategy = resolveAccountIncomeStrategy(
        storageKey,
        bucket,
        accountIncomeStrategies,
      );
      const withdrawRate = resolveAccountWithdrawRate(
        storageKey,
        strategy,
        accountWithdrawRates,
      );
      const medicalAnnualDraw =
        bucket === "hsa" ? c.strategy.hsaWdAnn : undefined;
      const line = {
        storageKey,
        bucket,
        currentBalance,
        bucketCurrentTotal: bucketCurrentTotal ?? currentBalance,
      };
      const breakdown = computeAccountIncomeBreakdown({
        line,
        balanceAtRetirement,
        strategy,
        withdrawRate,
        inflationAdj: inputs?.wdInflation ?? 0.025,
        accountIncomeFunds,
        medicalAnnualDraw,
      });

      const accordionContent =
        locale === "us"
          ? buildIncomeAccountAccordionContent(
              buildIncomeAccountAccordionParams({
                bucket,
                retirementAge,
                balanceAtRetirement,
                annualDraw: breakdown.monthlyTotal * 12,
                locale,
                inputs,
                tradWdAnn: c.strategy.tradWdAnn,
                medicalAnnualDraw,
                taxDetail: c.taxDetail,
                filingStatus: inputs?.filingStatus,
              }),
            )
          : null;

      return (
        <IncomeAccountRow
          key={storageKey}
          label={label}
          balanceAtRetirement={balanceAtRetirement}
          bucket={bucket}
          selectedTicker={ticker}
          strategy={strategy}
          accordionContent={accordionContent}
          onStrategyChange={(next) => {
            onAccountIncomeStrategyChange?.(storageKey, next);
            if (
              (next === "withdraw" || next === "both") &&
              accountWithdrawRates[storageKey] == null
            ) {
              onAccountWithdrawRateChange?.(
                storageKey,
                defaultWithdrawRateForStrategy(next),
              );
            }
          }}
          withdrawRate={withdrawRate}
          onWithdrawRateChange={(rate) =>
            onAccountWithdrawRateChange?.(storageKey, rate)
          }
          breakdown={breakdown}
          badgeOrder={badgeOrder}
          onFundSelect={(t) => onAccountIncomeFundChange?.(storageKey, t)}
        />
      );
    },
    [
      accountIncomeFunds,
      accountIncomeStrategies,
      accountWithdrawRates,
      c.strategy.hsaWdAnn,
      c.taxDetail,
      c.strategy.tradWdAnn,
      inputs,
      locale,
      onAccountIncomeFundChange,
      onAccountIncomeStrategyChange,
      onAccountWithdrawRateChange,
      resolveIncomeRowRetirementBalance,
      retirementAge,
    ],
  );

  function renderMergedDashboardIncomeContent() {
    const withdrawalUi = Boolean(showWithdrawalGuidance);
    const seq = withdrawalBucketOrder(retirementAge, true, locale);
    const pretaxTotal = retirementPretaxDisplayTotal(c.bal);
    const nodes: ReactNode[] = [];

    if (!hasAnyAccountCardData) return null;

    if (displayBalanceMode === "manual" && manualAccountEntries.length > 0) {
      for (const step of seq) {
        if (!localeSupportsWithdrawalBucket(locale, step)) continue;
        const entriesForStep = manualAccountEntries.filter(
          (entry) =>
            entry.type != null &&
            getAccountTypeMeta(entry.type, locale).withdrawalBucket === step,
        );
        for (const entry of entriesForStep) {
          const meta = getAccountTypeMeta(entry.type!, locale);
          const storageKey = canonicalIncomeStorageKeyForEntry(entry);
          const { order } = withdrawalUi
            ? metaFor(meta.withdrawalBucket)
            : { order: null };
          nodes.push(
            renderIncomeAccountRow(
              storageKey,
              meta.label,
              meta.withdrawalBucket,
              entry.balance,
              manualEntryBucketTotals[meta.withdrawalBucket],
              withdrawalUi ? order : null,
            ),
          );
        }
      }
      return (
        <div className="portfolio-account-list portfolio-account-list--income">
          {nodes}
        </div>
      );
    }

    for (const step of seq) {
      if (!localeSupportsWithdrawalBucket(locale, step)) continue;
      if (step === "brokerage") {
        if (!hasBrokerageAccountData || brkBal == null) continue;
        const { order: brkOrder } = withdrawalUi
          ? metaFor("brokerage")
          : { order: null };
        nodes.push(
          renderIncomeAccountRow(
            canonicalIncomeStorageKeyForBucket("brokerage"),
            importedBucketLabel("brokerage", "Brokerage"),
            "brokerage",
            brkBal,
            brkBal,
            withdrawalUi ? brkOrder : null,
          ),
        );
        continue;
      }
      if (!hasRetirementAccountData) continue;
      if (
        step === "pretax" &&
        pretaxTotal > 0 &&
        localeSupportsWithdrawalBucket(locale, "pretax")
      ) {
        const { order: pretaxOrder } = withdrawalUi
          ? metaFor("pretax")
          : { order: null };
        if (displayBalanceMode === "manual") {
          for (const row of visibleManualRetirementRows().filter(
            (r) =>
              r.key === "ret401k" || r.key === "se401k" || r.key === "tradIra",
          )) {
            nodes.push(
              renderIncomeAccountRow(
                canonicalIncomeStorageKeyForManualId(row.key),
                row.label,
                "pretax",
                display(row.key),
                pretaxTotal,
                withdrawalUi ? pretaxOrder : null,
              ),
            );
          }
        } else {
          nodes.push(
            renderIncomeAccountRow(
              canonicalIncomeStorageKeyForBucket("pretax"),
              importedBucketLabel("pretax", "Pre-tax"),
              "pretax",
              pretaxTotal,
              pretaxTotal,
              withdrawalUi ? pretaxOrder : null,
            ),
          );
        }
        continue;
      }
      if (
        step === "roth" &&
        c.bal.balRoth > 0 &&
        localeSupportsWithdrawalBucket(locale, "roth")
      ) {
        const { order: rothOrder } = withdrawalUi
          ? metaFor("roth")
          : { order: null };
        if (displayBalanceMode === "manual") {
          const rothRow = visibleManualRetirementRows().find(
            (r) => r.key === "roth",
          );
          if (rothRow) {
            nodes.push(
              renderIncomeAccountRow(
                canonicalIncomeStorageKeyForManualId(rothRow.key),
                rothRow.label,
                "roth",
                display(rothRow.key),
                c.bal.balRoth,
                withdrawalUi ? rothOrder : null,
              ),
            );
          }
        } else {
          nodes.push(
            renderIncomeAccountRow(
              canonicalIncomeStorageKeyForBucket("roth"),
              importedBucketLabel("roth", "Tax-advantaged"),
              "roth",
              c.bal.balRoth,
              c.bal.balRoth,
              withdrawalUi ? rothOrder : null,
            ),
          );
        }
        continue;
      }
      if (
        step === "hsa" &&
        c.bal.balHsa > 0 &&
        localeSupportsWithdrawalBucket(locale, "hsa")
      ) {
        const { order: hsaOrder } = withdrawalUi
          ? metaFor("hsa")
          : { order: null };
        if (displayBalanceMode === "manual") {
          const hsaRow = visibleManualRetirementRows().find(
            (r) => r.key === "hsa",
          );
          if (hsaRow) {
            nodes.push(
              renderIncomeAccountRow(
                canonicalIncomeStorageKeyForManualId(hsaRow.key),
                hsaRow.label,
                "hsa",
                display(hsaRow.key),
                c.bal.balHsa,
                withdrawalUi ? hsaOrder : null,
              ),
            );
          }
        } else {
          nodes.push(
            renderIncomeAccountRow(
              canonicalIncomeStorageKeyForBucket("hsa"),
              importedBucketLabel("hsa", "HSA"),
              "hsa",
              c.bal.balHsa,
              c.bal.balHsa,
              withdrawalUi ? hsaOrder : null,
            ),
          );
        }
      }
    }

    return (
      <div className="portfolio-account-list portfolio-account-list--income">
        {nodes}
      </div>
    );
  }

  function renderMergedDashboardOrderedContent() {
    if (!mergedDashboard) return null;
    if (incomeModeAccountRows) return renderMergedDashboardIncomeContent();

    const withdrawalUi = Boolean(showWithdrawalGuidance);
    const seq = withdrawalBucketOrder(retirementAge, true, locale);
    const pretaxTotal = retirementPretaxDisplayTotal(c.bal);
    const pretaxDef = {
      tax: "pretax" as const,
      label: importedBucketLabel("pretax", "Pre-tax"),
      total: pretaxTotal,
    };
    const rothDef = {
      tax: "roth" as const,
      label: importedBucketLabel("roth", "Tax-advantaged"),
      total: c.bal.balRoth,
    };
    const hsaDef = {
      tax: "hsa" as const,
      label: importedBucketLabel("hsa", "HSA"),
      total: c.bal.balHsa,
    };

    const nodes: ReactNode[] = [];

    if (!hasAnyAccountCardData) {
      return null;
    }

    if (displayBalanceMode === "manual") {
      if (manualAccountEntries.length > 0) {
        for (const step of seq) {
          const entriesForStep = manualAccountEntries.filter(
            (entry) =>
              entry.type != null &&
              getAccountTypeMeta(entry.type, locale).withdrawalBucket === step,
          );
          if (step === "brokerage") {
            for (const entry of entriesForStep) {
              const meta = getAccountTypeMeta(entry.type!, locale);
              nodes.push(
                renderManualPortfolioAccountCard(entry.id, {
                  label: meta.label,
                  bucket: meta.withdrawalBucket,
                  total: entry.balance,
                  withdrawalUi,
                  manualEntry: entry,
                }),
              );
            }
            continue;
          }
          if (!hasRetirementAccountData && entriesForStep.length === 0)
            continue;
          for (const entry of entriesForStep) {
            const meta = getAccountTypeMeta(entry.type!, locale);
            nodes.push(
              renderManualPortfolioAccountCard(entry.id, {
                label: meta.label,
                bucket: meta.withdrawalBucket,
                total: entry.balance,
                withdrawalUi,
                manualEntry: entry,
              }),
            );
          }
        }
        return <div className="portfolio-account-list">{nodes}</div>;
      }

      for (const step of seq) {
        if (step === "brokerage") {
          if (!hasBrokerageAccountData) continue;
          nodes.push(renderMergedBrokerageBlock(withdrawalUi));
          continue;
        }
        if (!hasRetirementAccountData) continue;
        if (step === "pretax") {
          for (const row of visibleManualRetirementRows().filter(
            (r) =>
              r.key === "ret401k" || r.key === "se401k" || r.key === "tradIra",
          )) {
            nodes.push(
              renderManualPortfolioAccountCard(row.key, {
                label: row.label,
                bucket: "pretax",
                total: display(row.key),
                withdrawalUi,
              }),
            );
          }
          continue;
        }
        if (step === "roth") {
          const rothRow = visibleManualRetirementRows().find(
            (r) => r.key === "roth",
          );
          if (rothRow) {
            nodes.push(
              renderManualPortfolioAccountCard(rothRow.key, {
                label: rothRow.label,
                bucket: "roth",
                total: display(rothRow.key),
                withdrawalUi,
              }),
            );
          }
          continue;
        }
        if (step === "hsa") {
          const hsaRow = visibleManualRetirementRows().find(
            (r) => r.key === "hsa",
          );
          if (hsaRow) {
            nodes.push(
              renderManualPortfolioAccountCard(hsaRow.key, {
                label: hsaRow.label,
                bucket: "hsa",
                total: display(hsaRow.key),
                withdrawalUi,
              }),
            );
          }
        }
      }
      return <div className="portfolio-account-list">{nodes}</div>;
    }

    for (const step of seq) {
      if (step === "brokerage") {
        if (!hasBrokerageAccountData) continue;
        nodes.push(renderMergedBrokerageBlock(withdrawalUi));
        continue;
      }
      if (!hasRetirementAccountData) continue;
      if (step === "pretax") {
        if (pretaxDef.total > 0)
          nodes.push(
            renderImportedTaxDisclosure("pretax", pretaxDef, withdrawalUi),
          );
        continue;
      }
      if (step === "roth") {
        if (rothDef.total > 0)
          nodes.push(
            renderImportedTaxDisclosure("roth", rothDef, withdrawalUi),
          );
        continue;
      }
      if (step === "hsa") {
        if (hsaDef.total > 0)
          nodes.push(renderImportedTaxDisclosure("hsa", hsaDef, withdrawalUi));
      }
    }

    return <div className="portfolio-account-list">{nodes}</div>;
  }

  const cardStyle: CSSProperties = {
    marginBottom: mergedDashboard
      ? 0
      : configureInputsOnly && stackWithBrokerage
        ? "var(--space-2)"
        : "var(--space-4)",
  };

  const renderMergedDashboardOverlays = () => (
    <div className="account-balances-dashboard-overlays">
      {balanceEditPanel === "manual" && !manageMenuOpen ? (
        <aside
          className={`account-balances-manual-sheet account-balances-edit-sheet account-balances-edit-sheet--manual${balanceEditClosing ? " account-balances-manual-sheet--closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-balances-manual-title"
          onAnimationEnd={onBalanceEditSheetAnimationEnd}
        >
          {renderManualBalancesPanelContent({ embedded: false })}
        </aside>
      ) : null}
      {!csvImportModalOpen &&
        !manageMenuOpen &&
        renderReplaceSourceConfirmOverlay()}
      {!manageMenuOpen && renderRemoveAccountsConfirmOverlay()}
    </div>
  );

  const totalRetirementBar =
    !configureInputsOnly &&
    (mergedDashboard ? hasAnyAccountCardData : hasRetirementAccountData) ? (
      <div
        className={[
          "account-balances-total-retirement",
          mergedDashboard ? "account-balances-total-retirement--merged" : "",
          incomeModeDashboard
            ? "account-balances-total-retirement--income"
            : "",
          !mergedDashboard && stackWithBrokerage
            ? "account-balances-total-retirement--stack-with-brokerage"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {!incomeModeDashboard ? (
          <span className="account-balances-total-retirement__label">
            {portfolioTotalLabel}
          </span>
        ) : null}
        <span className="account-balances-total-retirement__value">
          {portfolioTotalDisplay}
        </span>
      </div>
    ) : null;

  const accountSectionFooter =
    !configureInputsOnly &&
    (mergedDashboard ? hasAnyAccountCardData : hasRetirementAccountData)
      ? totalRetirementBar
      : null;

  const headerManageMenu = renderAccountBalancesManageMenu();

  const accountBalancesBody = (
    <>
      {mergedDashboard ? (
        <>
          <ManualProjectionsCallout
            hasPortfolioBalances={c.hasPortfolioBalances}
            positionsImportRev={positionsImportRev}
            onConnectAccounts={() => setOpenManageRequest((n) => n + 1)}
            onImportCsv={() => setOpenManageRequest((n) => n + 1)}
          />
          {showImportedHoldingsScenarioGuide ? (
            <ImportedHoldingsScenarioGuide
              holdings={aggregatedHoldingsForGuide}
              variant="growth"
            />
          ) : null}
          {showImportedAccountsYieldGuide ? (
            <ImportedHoldingsScenarioGuide
              holdings={aggregatedHoldingsForGuide}
              variant="income"
              inflationAdj={inputs?.wdInflation ?? 0.025}
              onInflationAdjChange={
                inputs && setInputs
                  ? (value) => setInputs({ wdInflation: value })
                  : undefined
              }
            />
          ) : null}
          {hasAnyAccountCardData ? (
            <>
              <div className="account-balances-header-row">
                <div className="account-balances-header-row__title-block">
                  <h2 className="account-balances-header-row__title">
                    Retirement Accounts
                  </h2>
                  {phase === "growth" || showWithdrawalGuidance ? (
                    <TaxBreakdownPanelTrigger>
                      Tax Details
                    </TaxBreakdownPanelTrigger>
                  ) : null}
                </div>
                <div className="account-balances-header-row__actions">
                  <div className="account-balances-header-row__actions-primary">
                    {phase === "growth" && inputs && setInputs ? (
                      <MarketScenarioSelector
                        value={normalizeMarketScenarioId(inputs.marketScenario)}
                        onChange={(marketScenario) => {
                          const id = normalizeMarketScenarioId(marketScenario);
                          setInputs({
                            marketScenario: id,
                            marketScenarioActive: !marketScenarioIsBase(id),
                          });
                        }}
                      />
                    ) : null}
                    {headerManageMenu}
                  </div>
                </div>
              </div>
              {phase === "growth" && inputs && setInputs ? (
                <div className="account-balances-market-scenario-row">
                  <MarketScenarioButtonGroup
                    value={normalizeMarketScenarioId(inputs.marketScenario)}
                    onChange={(marketScenario) => {
                      const id = normalizeMarketScenarioId(marketScenario);
                      setInputs({
                        marketScenario: id,
                        marketScenarioActive: !marketScenarioIsBase(id),
                      });
                    }}
                  />
                </div>
              ) : null}
            </>
          ) : null}
          <div
            className={[
              "market-scenario-context-row-wrap",
              showMarketScenarioContext &&
                "market-scenario-context-row-wrap--open",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="market-scenario-context-row-wrap__inner">
              {marketScenarioCardMounted && inputs && setInputs ? (
                <MarketScenarioContextRow
                  scenarioId={marketScenarioId}
                  c={c}
                  inputs={inputs}
                  balanceModes={{
                    retirement: balanceMode,
                    brokerage: brokerageMode ?? "manual",
                  }}
                  retRate={inputs.retRate}
                  brkRate={brkRate ?? inputs.brkRate}
                  hasScenarioOverrides={hasMarketScenarioOverrides}
                />
              ) : null}
            </div>
          </div>
          <div
            className={[
              "account-balances-stack",
              !hasAnyAccountCardData &&
                "account-balances-stack--awaiting-accounts",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div
              className={`account-balances-card-inner-wrap${
                !hasAnyAccountCardData
                  ? " account-balances-card-inner-wrap--empty-state"
                  : ""
              }`}
              style={hasAnyAccountCardData ? cardStyle : undefined}
            >
              {!hasAnyAccountCardData && canEditBalances
                ? renderAccountBalancesManageMenu({
                    hideTrigger: true,
                    initialOpen: true,
                    requiredEntry: true,
                    postOnboardingImport: showPostOnboardingImport,
                  })
                : null}
              <div className="account-balances-card-scroll">
                {renderMergedDashboardOrderedContent()}
              </div>
              {accountSectionFooter}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="input-col-title">Retirement Accounts</div>
          {phase === "growth" || showWithdrawalGuidance ? (
            <TaxBreakdownPanelTrigger>Tax Details</TaxBreakdownPanelTrigger>
          ) : null}
          {!readOnly &&
          (hasRetirementAccountData || balanceMode === "imported") ? (
            <div className="balance-input-toolbar">
              {showBalanceEntryActions
                ? renderAccountBalancesManageMenu()
                : null}
              {balanceMode === "imported" ? (
                <PositionsCsvImport
                  variant="toolbar"
                  initialCustodian={csvImportPrefillCustodian}
                  fileIngestRequest={csvFileIngestRequest}
                  onImportFlowClose={finishCsvImportLaunch}
                  onApplyBalances={onImportedApplyBalances!}
                  onImportApplied={() => {
                    onPositionsImportApplied?.();
                    finishCsvImportLaunch();
                  }}
                />
              ) : null}
            </div>
          ) : null}

          <div className="account-balances-stack">
            <div
              className={`account-balances-card-inner-wrap account-balances-card-inner-wrap--standalone${
                !hasRetirementAccountData
                  ? " account-balances-card-inner-wrap--empty-state"
                  : ""
              }${
                removeAccountsModalState.isOpen
                  ? " account-balances-card-inner-wrap--scenario-slide-open"
                  : ""
              }`}
              style={cardStyle}
            >
              {renderBalanceRows()}
              {!manageMenuOpen && renderReplaceSourceConfirmOverlay()}
              {!manageMenuOpen && renderRemoveAccountsConfirmOverlay()}
            </div>
          </div>
          {accountSectionFooter}
        </>
      )}
      {mergedDashboard ? renderMergedDashboardOverlays() : null}
    </>
  );

  const accountBalancesBodyWithPopoutData = (
    <AccountScenarioPopoutDataProvider value={accountScenarioPopoutData}>
      {accountBalancesBody}
    </AccountScenarioPopoutDataProvider>
  );

  const csvImportModal =
    mergedDashboard &&
    csvFileIngestRequest &&
    onImportedApplyBalances &&
    !manageMenuOpen ? (
      <PositionsCsvImport
        presentation="modal"
        hideTrigger
        initialCustodian={csvImportPrefillCustodian}
        fileIngestRequest={csvFileIngestRequest}
        onImportFlowClose={handleManageBackToMethod}
        onApplyBalances={onImportedApplyBalances}
        onImportApplied={() => {
          onPositionsImportApplied?.();
          finishCsvImportLaunch();
        }}
        showManualReplaceNotice={willRemoveManualOnConnect}
      />
    ) : null;

  if (onImportedApplyBalances) {
    return (
      <PlaidConnectionProvider
        residenceCountry={inputs?.residenceCountry}
        onApplyBalances={onImportedApplyBalances}
        onImportApplied={onPositionsImportApplied}
      >
        {accountBalancesBodyWithPopoutData}
        {csvImportModal}
        {csvImportModalOpen && renderReplaceSourceConfirmOverlay(true)}
      </PlaidConnectionProvider>
    );
  }

  return accountBalancesBodyWithPopoutData;
}
