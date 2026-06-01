/** @typedef {'single' | 'marriedFilingJointly' | 'marriedFilingSeparately' | 'headOfHousehold'} FilingStatusId */

export const DEFAULT_FILING_STATUS = 'marriedFilingJointly';

/** @type {Record<FilingStatusId, number>} */
export const STD_DEDUCTIONS_2024 = {
  single: 14600,
  marriedFilingJointly: 29200,
  marriedFilingSeparately: 14600,
  headOfHousehold: 21900,
};

/**
 * 2024 ordinary-income bracket ceilings (taxable income, dollars).
 * @type {Record<FilingStatusId, { upTo: number; rate: number }[]>}
 */
const ORDINARY_BRACKETS_2024 = {
  single: [
    { upTo: 11600, rate: 0.1 },
    { upTo: 47150, rate: 0.12 },
    { upTo: 100525, rate: 0.22 },
    { upTo: 191950, rate: 0.24 },
    { upTo: 243725, rate: 0.32 },
    { upTo: 609350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  marriedFilingJointly: [
    { upTo: 23200, rate: 0.1 },
    { upTo: 94300, rate: 0.12 },
    { upTo: 201050, rate: 0.22 },
    { upTo: 383900, rate: 0.24 },
    { upTo: 487450, rate: 0.32 },
    { upTo: 731200, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  marriedFilingSeparately: [
    { upTo: 11600, rate: 0.1 },
    { upTo: 47150, rate: 0.12 },
    { upTo: 100525, rate: 0.22 },
    { upTo: 191950, rate: 0.24 },
    { upTo: 243725, rate: 0.32 },
    { upTo: 365600, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  headOfHousehold: [
    { upTo: 16550, rate: 0.1 },
    { upTo: 63100, rate: 0.12 },
    { upTo: 100500, rate: 0.22 },
    { upTo: 191950, rate: 0.24 },
    { upTo: 243700, rate: 0.32 },
    { upTo: 609350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
};

/** Top of 12% bracket in taxable income — Roth conversion room anchor. */
/** @type {Record<FilingStatusId, number>} */
const TOP_OF_12_PCT_BRACKET_2024 = {
  single: 47150,
  marriedFilingJointly: 94300,
  marriedFilingSeparately: 47150,
  headOfHousehold: 63100,
};

/** LTCG 0% rate ends when taxable ordinary + gains exceed this (simplified). */
/** @type {Record<FilingStatusId, number>} */
const LTCG_0_PCT_THRESHOLD_2024 = {
  single: 47025,
  marriedFilingJointly: 94050,
  marriedFilingSeparately: 47025,
  headOfHousehold: 63000,
};

/** @type {Record<FilingStatusId, { half50: number; full85: number; always85: boolean }>} */
const SS_PROVISIONAL_2024 = {
  single: { half50: 25000, full85: 34000, always85: false },
  headOfHousehold: { half50: 25000, full85: 34000, always85: false },
  marriedFilingJointly: { half50: 32000, full85: 44000, always85: false },
  marriedFilingSeparately: { half50: 0, full85: 0, always85: true },
};

const FILING_STATUS_IDS = /** @type {const} */ ([
  'single',
  'marriedFilingJointly',
  'marriedFilingSeparately',
  'headOfHousehold',
]);

/** @param {unknown} raw */
export function normalizeFilingStatus(raw) {
  if (typeof raw === 'string' && FILING_STATUS_IDS.includes(/** @type {FilingStatusId} */ (raw))) {
    return /** @type {FilingStatusId} */ (raw);
  }
  const labelMap = {
    Single: 'single',
    'Married Filing Jointly': 'marriedFilingJointly',
    'Married Filing Separately': 'marriedFilingSeparately',
    'Head of Household': 'headOfHousehold',
  };
  if (typeof raw === 'string' && raw in labelMap) {
    return /** @type {FilingStatusId} */ (labelMap[/** @type {keyof typeof labelMap} */ (raw)]);
  }
  return DEFAULT_FILING_STATUS;
}

/** @param {FilingStatusId} status */
export function standardDeductionForFilingStatus(status) {
  return STD_DEDUCTIONS_2024[normalizeFilingStatus(status)];
}

/** @param {number} taxableIncome @param {FilingStatusId} status */
export function ordinaryIncomeTax(taxableIncome, status) {
  const id = normalizeFilingStatus(status);
  const brackets = ORDINARY_BRACKETS_2024[id];
  const income = Math.max(0, taxableIncome);
  let tax = 0;
  let lower = 0;
  for (const { upTo, rate } of brackets) {
    if (income <= lower) break;
    const upper = Math.min(income, upTo);
    tax += (upper - lower) * rate;
    lower = upTo;
    if (income <= upTo) break;
  }
  return tax;
}

/** @param {number} ssAnn @param {number} provisional @param {FilingStatusId} status */
export function ssTaxableFromProvisional(ssAnn, provisional, status) {
  const t = SS_PROVISIONAL_2024[normalizeFilingStatus(status)];
  if (t.always85) return ssAnn * 0.85;
  if (provisional > t.full85) return ssAnn * 0.85;
  if (provisional > t.half50) return ssAnn * 0.5;
  return 0;
}

/** @param {number} ordinaryIncome @param {number} brkGain @param {FilingStatusId} status */
export function ltcgTaxRate(ordinaryIncome, brkGain, status) {
  const threshold = LTCG_0_PCT_THRESHOLD_2024[normalizeFilingStatus(status)];
  return ordinaryIncome + brkGain > threshold ? 0.15 : 0;
}

/**
 * Room before 22% bracket for Roth conversions (annual pre-tax withdrawal basis).
 * @param {number} tradWdAnn
 * @param {FilingStatusId} status
 */
export function rothConversionRoom(tradWdAnn, status) {
  const id = normalizeFilingStatus(status);
  const stdDed = STD_DEDUCTIONS_2024[id];
  const top12 = TOP_OF_12_PCT_BRACKET_2024[id];
  const taxableTrad = Math.max(0, tradWdAnn - stdDed);
  return Math.max(0, top12 - taxableTrad);
}

/** SS provisional income UI thresholds (combined income for bar). */
/** @param {FilingStatusId} status */
export function ssProvisionalThresholds(status) {
  const t = SS_PROVISIONAL_2024[normalizeFilingStatus(status)];
  if (t.always85) {
    return { half50: 0, full85: 1, always85: true };
  }
  return { half50: t.half50, full85: t.full85, always85: false };
}

export const FILING_STATUS_LABELS = {
  single: 'Single',
  marriedFilingJointly: 'Married Filing Jointly',
  marriedFilingSeparately: 'Married Filing Separately',
  headOfHousehold: 'Head of Household',
};

/** @param {FilingStatusId} status */
export function filingStatusLabel(status) {
  return FILING_STATUS_LABELS[normalizeFilingStatus(status)];
}
