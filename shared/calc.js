import { SS_62, SS_67, SS_70, SP_SS_62, SP_SS_67, SP_SS_70, YEARS } from './constants.js';

function fv(pv, r, n) {
  return pv * Math.pow(1 + r, n);
}

function fvAnnuity(pmt, r, n) {
  if (pmt === 0) return 0;
  if (r === 0) return pmt * n;
  return pmt * ((Math.pow(1 + r, n) - 1) / r);
}

/**
 * Calculate federal tax — MARRIED FILING JOINTLY
 * Ported verbatim from retirement-calculator.html (calcTaxDetailed).
 */
export function calcTaxDetailed(tradWd, rothWd, hsaWd, brkWd, ssMon) {
  const ssAnn = ssMon * 12;
  const brkGain = brkWd * 0.60; // ~60% of brokerage withdrawal is taxable gain

  // ── Step 1: SS provisional income (MFJ thresholds) ──
  const provisional = tradWd + brkGain + ssAnn * 0.5;
  let ssTaxable = 0;
  if (provisional > 44000) ssTaxable = ssAnn * 0.85;
  else if (provisional > 32000) ssTaxable = ssAnn * 0.5;

  // ── Step 2: Ordinary income tax (MFJ) ──
  const stdDed = 29200; // MFJ 2024 standard deduction
  const ordinaryGross = tradWd + ssTaxable;
  const ordinaryIncome = Math.max(0, ordinaryGross - stdDed);

  let ordTax = 0;
  if (ordinaryIncome > 731200) ordTax = 196669 + (ordinaryIncome - 731200) * 0.37;
  else if (ordinaryIncome > 487450) ordTax = 111357 + (ordinaryIncome - 487450) * 0.35;
  else if (ordinaryIncome > 383350) ordTax = 78221 + (ordinaryIncome - 383350) * 0.32;
  else if (ordinaryIncome > 201050) ordTax = 34647 + (ordinaryIncome - 201050) * 0.24;
  else if (ordinaryIncome > 94300) ordTax = 10294 + (ordinaryIncome - 94300) * 0.22;
  else if (ordinaryIncome > 23200) ordTax = 2320 + (ordinaryIncome - 23200) * 0.12;
  else ordTax = ordinaryIncome * 0.1;

  // ── Step 3: Long-term capital gains tax (MFJ) ──
  const ltcgRate = ordinaryIncome + brkGain > 94050 ? 0.15 : 0;
  const ltcgTax = brkGain * ltcgRate;

  const totalTax = ordTax + ltcgTax;
  const grossIncome = tradWd + brkWd + ssAnn;

  return {
    totalTax,
    ordTax,
    ltcgTax,
    tradWd,
    rothWd,
    hsaWd,
    brkWd,
    brkGain,
    ordinaryIncome,
    ssTaxable,
    provisional,
    ssExclusion: ssAnn - ssTaxable,
    rothHsaExclusion: rothWd + hsaWd,
    effectiveRate: grossIncome > 0 ? totalTax / grossIncome : 0,
  };
}

/** Wrapper from HTML — splits total withdrawal by portfolio weights before calcTaxDetailed. */
export function calcTax(annWd, ssMon, retFV, brkFV, tradRatio, rothRatio, hsaRatio) {
  const totalFV = retFV + brkFV;
  if (totalFV <= 0) return 0;
  const retWdAnn = annWd * (retFV / totalFV);
  const brkWdAnn = annWd * (brkFV / totalFV);
  return calcTaxDetailed(
    retWdAnn * tradRatio,
    retWdAnn * rothRatio,
    retWdAnn * hsaRatio,
    brkWdAnn,
    ssMon,
  ).totalTax;
}

export function ssFromAge(age) {
  if (age <= 62) return SS_62;
  if (age >= 70) return SS_70;
  if (age <= 67) return Math.round(SS_62 + ((SS_67 - SS_62) * (age - 62)) / 5);
  return Math.round(SS_67 + ((SS_70 - SS_67) * (age - 67)) / 3);
}

export function spouseSSFromAge(age) {
  if (age <= 62) return SP_SS_62;
  if (age >= 70) return SP_SS_70;
  if (age <= 67) return Math.round(SP_SS_62 + ((SP_SS_67 - SP_SS_62) * (age - 62)) / 5);
  return Math.round(SP_SS_67 + ((SP_SS_70 - SP_SS_67) * (age - 67)) / 3);
}

/**
 * Growth phase → portfolio at retirement: compound retirement balances + savings annuity + brokerage.
 */
export function calcPortfolioAtRetirement({
  retBal,
  save,
  retRate,
  brkBal,
  brkRate,
  years = YEARS,
}) {
  const retBalanceFV = fv(retBal, retRate, years);
  const savingsFV = fvAnnuity(save, retRate, years);
  const retFV = retBalanceFV + savingsFV;
  const brkFV = fv(brkBal, brkRate, years);
  const totalFV = retFV + brkFV;
  return {
    retBalanceFV,
    savingsFV,
    retFV,
    brkFV,
    totalFV,
  };
}

/**
 * Income phase: SS reinvested, NAV drift, yield-based monthly income at 62 / 70 / 80
 * (HTML block inside `if (incomeMode)` in update()).
 */
export function calcIncomePhase({
  totalFV,
  incYield,
  incGrowth,
  wdRate,
  wdInflation = 0,
  totalSSMonthly,
  ssIncluded,
  retirementStartAge = 62,
}) {
  const yield_ = incYield;
  const nav_ = incGrowth;
  const totalSS = totalSSMonthly;
  const ssAnnual = totalSS * 12;

  const reinvestRate = yield_ + nav_;

  function portAtAge(age) {
    const yrs = Math.max(0, age - retirementStartAge);
    const navDrift = totalFV * Math.pow(1 + nav_, yrs);
    const ssAccum = ssIncluded ? fvAnnuity(ssAnnual, reinvestRate, yrs) : 0;
    return navDrift + ssAccum;
  }

  const port62 = totalFV;
  const port70 = portAtAge(70);
  const port80 = portAtAge(80);

  const inc62 = (port62 * yield_) / 12;
  const inc70 = (port70 * yield_) / 12;
  const inc80 = (port80 * yield_) / 12;
  const wdMon = (totalFV * wdRate * (1 + wdInflation)) / 12;
  const diff = inc62 - wdMon;

  return {
    port62,
    port70,
    port80,
    inc62,
    inc70,
    inc80,
    wdMon,
    diff,
    reinvestRate,
    ssAnnual,
  };
}

export { fv, fvAnnuity };
