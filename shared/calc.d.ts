export type TaxDetailedResult = {
  totalTax: number;
  ordTax: number;
  ltcgTax: number;
  tradWd: number;
  rothWd: number;
  hsaWd: number;
  brkWd: number;
  brkGain: number;
  ordinaryIncome: number;
  ssTaxable: number;
  provisional: number;
  ssExclusion: number;
  rothHsaExclusion: number;
  effectiveRate: number;
};

import type { FilingStatusId } from './filingStatusTax'

export type { FilingStatusId } from './filingStatusTax'
export {
  DEFAULT_FILING_STATUS,
  STD_DEDUCTIONS_2024,
  FILING_STATUS_LABELS,
  normalizeFilingStatus,
  standardDeductionForFilingStatus,
  ordinaryIncomeTax,
  ssTaxableFromProvisional,
  ltcgTaxRate,
  rothConversionRoom,
  ssProvisionalThresholds,
  filingStatusLabel,
} from './filingStatusTax'

export function calcTaxDetailed(
  tradWd: number,
  rothWd: number,
  hsaWd: number,
  brkWd: number,
  ssMon: number,
  filingStatus?: FilingStatusId,
): TaxDetailedResult;

export function calcTax(
  annWd: number,
  ssMon: number,
  retFV: number,
  brkFV: number,
  tradRatio: number,
  rothRatio: number,
  hsaRatio: number,
  filingStatus?: FilingStatusId,
): number;

export function ssFromAge(age: number): number;
export function spouseSSFromAge(age: number): number;

export type PortfolioAtRetirementParams = {
  retBal: number;
  save: number;
  retRate: number;
  brkBal: number;
  brkRate: number;
  years?: number;
};

export type PortfolioAtRetirementResult = {
  retBalanceFV: number;
  savingsFV: number;
  retFV: number;
  brkFV: number;
  totalFV: number;
};

export function calcPortfolioAtRetirement(
  params: PortfolioAtRetirementParams,
): PortfolioAtRetirementResult;

export type IncomePhaseParams = {
  totalFV: number;
  incYield: number;
  incGrowth: number;
  wdRate: number;
  /** Decimal annual uplift on withdrawal (e.g. 0.025); default 0. */
  wdInflation?: number;
  totalSSMonthly: number;
  ssIncluded: boolean;
  /** Age when the growth model reaches `totalFV` (default 62). */
  retirementStartAge?: number;
  /** When set, SS reinvestment phases in each source at its start age. */
  guaranteedSources?: ReadonlyArray<{ startAge: number; monthlyAmount: number }>;
};

export type IncomePhaseResult = {
  port62: number;
  port70: number;
  port80: number;
  inc62: number;
  inc70: number;
  inc80: number;
  wdMon: number;
  diff: number;
  reinvestRate: number;
  ssAnnual: number;
};

export function calcIncomePhase(params: IncomePhaseParams): IncomePhaseResult;

export function fv(pv: number, r: number, n: number): number;
export function fvAnnuity(pmt: number, r: number, n: number): number;
