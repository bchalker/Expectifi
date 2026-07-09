/** Growth horizon: age 55 → 62 */
export const YEARS = 7;
export const YEARS_TO_RETIREMENT = YEARS;

export const HOME_EQUITY = 250000;
export const SCENARIOS = [6, 12, 18, 24, 40, 55];

export const SS_FACTOR = 0.75;
export const SS_62 = Math.round(2599 * SS_FACTOR);
export const SS_67 = Math.round(3888 * SS_FACTOR);
export const SS_70 = Math.round(4939 * SS_FACTOR);
// Spouse SS = 50% spousal benefit × 75% factor
export const SP_SS_62 = Math.round(1299 * SS_FACTOR);
export const SP_SS_67 = Math.round(1944 * SS_FACTOR);
export const SP_SS_70 = Math.round(2469 * SS_FACTOR);

// ── Default account balances (from HTML; UI may override) ──
export const BAL_TRAD_SE401K = 50994;
export const BAL_TRAD_401K = 183587;
export const BAL_ROTH_IRA = 24243;
export const BAL_ROTH_SE401K = 0;
export const BAL_HSA = 17433;

export const TRAD_TOTAL = BAL_TRAD_SE401K + BAL_TRAD_401K;
export const ROTH_TOTAL = BAL_ROTH_IRA + BAL_ROTH_SE401K;
export const HSA_TOTAL = BAL_HSA;
export const RET_BASE = TRAD_TOTAL + ROTH_TOTAL + HSA_TOTAL;
export const TRAD_RATIO_STATIC = TRAD_TOTAL / RET_BASE;
export const ROTH_RATIO_STATIC = ROTH_TOTAL / RET_BASE;
export const HSA_RATIO_STATIC = HSA_TOTAL / RET_BASE;

/** Fallback ratios when retBal is 0 (matches getInputs() in HTML) */
export const DEFAULT_TRAD_RATIO = 0.849;
export const DEFAULT_ROTH_RATIO = 0.088;
export const DEFAULT_HSA_RATIO = 0.063;
