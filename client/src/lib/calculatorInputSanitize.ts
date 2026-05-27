import type { CalculatorInputs } from './computeResults'

export const FINANCIAL_INPUT_KEYS = [
  'base401k',
  'baseSE401k',
  'baseTradIRA',
  'baseRoth',
  'baseHsa',
  'brkBal',
] as const satisfies readonly (keyof CalculatorInputs)[]

export function stripFinancialFields(inputs: CalculatorInputs): CalculatorInputs {
  return {
    ...inputs,
    base401k: 0,
    baseSE401k: 0,
    baseTradIRA: 0,
    baseRoth: 0,
    baseHsa: 0,
    brkBal: 0,
  }
}

/** Drop imported-holdings totals and per-line models (non-pro tiers persist manual accounts separately). */
export function stripCsvDerivedFromCalculatorInputs(inputs: CalculatorInputs): CalculatorInputs {
  return {
    ...stripFinancialFields(inputs),
    positionReturnModels: [],
  }
}
