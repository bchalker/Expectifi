/** State income tax + retirement exemptions — Tax Foundation–style planning constants. */

import { getStateRetirementTaxDetail } from './stateRetirementTaxDetail'
import type { RetirementTaxDetail } from './retirementTaxDetail'

export type StateTaxEntry = {
  code: string
  name: string
  noIncomeTax: boolean
  /** Effective rate on retirement income (decimal), simplified planning model. */
  retirementIncomeRate: number
  retirementExemptions: string
  propertyTaxRate: number
  salesTaxRate: number
  healthcareNotes: string
  teleportSlug: string
  defaultMonthlyCostUsd: number
  lastVerified: string
  sourceUrl: string
  retirementTaxDetail: RetirementTaxDetail
}

export const STATE_TAX_RATES: Record<string, StateTaxEntry> = {
  AL: entry('AL', 'Alabama', 0.05, 'Pensions taxable; partial exclusion for certain gov pensions.', 0.0041, 0.04, 'birmingham-al', 3200),
  AK: entry('AK', 'Alaska', 0, 'No state income tax.', 0.0104, 0, 'anchorage-ak', 3800, true),
  AZ: entry('AZ', 'Arizona', 0.025, 'Public pensions often exempt; private retirement may be taxed at ordinary rates.', 0.0062, 0.056, 'phoenix-az', 3400),
  AR: entry('AR', 'Arkansas', 0.044, 'Social Security exempt; other retirement partially taxable.', 0.0062, 0.065, 'little-rock-ar', 2900),
  CA: entry('CA', 'California', 0.06, 'Most retirement income taxable; CalPERS may differ.', 0.0073, 0.0725, 'los-angeles-ca', 5200),
  CO: entry('CO', 'Colorado', 0.044, 'Social Security exempt for many; other retirement taxable.', 0.005, 0.029, 'denver-co', 4000),
  CT: entry('CT', 'Connecticut', 0.05, 'Partial exclusion for pensions/Social Security at higher incomes.', 0.018, 0.0635, 'hartford-ct', 4500),
  DE: entry('DE', 'Delaware', 0.055, 'Social Security exempt; pensions may qualify for exclusion.', 0.0057, 0, 'wilmington-de', 3600),
  FL: entry('FL', 'Florida', 0, 'No state income tax; retirement income not taxed.', 0.0098, 0.06, 'miami-fl', 3800, true),
  GA: entry('GA', 'Georgia', 0.055, 'Up to $65k retirement exclusion for ages 62+ (simplified).', 0.0092, 0.04, 'atlanta-ga', 3600),
  HI: entry('HI', 'Hawaii', 0.06, 'Some public pensions exempt; private retirement taxable.', 0.0028, 0.04, 'honolulu-hi', 4800),
  ID: entry('ID', 'Idaho', 0.058, 'Social Security exempt; other retirement taxable.', 0.0069, 0.06, 'boise-id', 3200),
  IL: entry('IL', 'Illinois', 0.0495, 'Retirement income largely exempt (pensions, 401k, IRA).', 0.021, 0.0625, 'chicago-il', 3800),
  IN: entry('IN', 'Indiana', 0.0315, 'Social Security exempt; other retirement taxable.', 0.0085, 0.07, 'indianapolis-in', 3100),
  IA: entry('IA', 'Iowa', 0.044, 'Social Security exempt; other retirement partially taxable.', 0.015, 0.06, 'des-moines-ia', 3000),
  KS: entry('KS', 'Kansas', 0.052, 'Public pensions often exempt; Social Security exempt for many.', 0.012, 0.065, 'wichita-ks', 3000),
  KY: entry('KY', 'Kentucky', 0.04, 'Pensions up to $31,110 exempt per person (simplified).', 0.009, 0.06, 'louisville-ky', 3000),
  LA: entry('LA', 'Louisiana', 0.0425, 'Social Security and public pensions exempt for many.', 0.0055, 0.0445, 'new-orleans-la', 3100),
  ME: entry('ME', 'Maine', 0.058, 'Pension exclusion up to $35k for eligible retirees.', 0.012, 0.055, 'portland-me', 3600),
  MD: entry('MD', 'Maryland', 0.05, 'Pension exclusion up to $34,300; Social Security exempt.', 0.0106, 0.06, 'baltimore-md', 4200),
  MA: entry('MA', 'Massachusetts', 0.05, 'Public pensions exempt; private retirement taxable.', 0.011, 0.0625, 'boston-ma', 4800),
  MI: entry('MI', 'Michigan', 0.0425, 'Public pensions exempt; private retirement partially taxable.', 0.014, 0.06, 'detroit-mi', 3300),
  MN: entry('MN', 'Minnesota', 0.0685, 'Social Security partial subtraction; other retirement taxable.', 0.0105, 0.0688, 'minneapolis-mn', 3800),
  MS: entry('MS', 'Mississippi', 0.05, 'Pensions and retirement accounts exempt after age 59½ (simplified).', 0.0081, 0.07, 'jackson-ms', 2800),
  MO: entry('MO', 'Missouri', 0.048, 'Social Security exempt; public pensions often exempt.', 0.0098, 0.0423, 'kansas-city-mo', 3100),
  MT: entry('MT', 'Montana', 0.059, 'Social Security partially taxable; other retirement taxable.', 0.0084, 0, 'billings-mt', 3300),
  NE: entry('NE', 'Nebraska', 0.0584, 'Social Security exempt for many; other retirement taxable.', 0.016, 0.055, 'omaha-ne', 3100),
  NV: entry('NV', 'Nevada', 0, 'No state income tax.', 0.006, 0.0685, 'las-vegas-nv', 3500, true),
  NH: entry('NH', 'New Hampshire', 0, 'No tax on wages; interest/dividends limited tax repealed 2025.', 0.018, 0, 'manchester-nh', 4000, true),
  NJ: entry('NJ', 'New Jersey', 0.055, 'Social Security exempt; pensions may be excluded up to thresholds.', 0.021, 0.0663, 'newark-nj', 4500),
  NM: entry('NM', 'New Mexico', 0.049, 'Social Security exempt for many; other retirement taxable.', 0.008, 0.0513, 'albuquerque-nm', 3200),
  NY: entry('NY', 'New York', 0.06, 'Pensions from NYS/local gov exempt; private retirement taxable.', 0.017, 0.04, 'new-york-ny', 5200),
  NC: entry('NC', 'North Carolina', 0.0475, 'Social Security not taxed; other retirement taxable at flat rate.', 0.0084, 0.0475, 'raleigh-nc', 3400),
  ND: entry('ND', 'North Dakota', 0.0195, 'Social Security exempt; other retirement taxable.', 0.0098, 0.05, 'fargo-nd', 3000),
  OH: entry('OH', 'Ohio', 0.035, 'Social Security exempt; retirement credit may apply.', 0.015, 0.0575, 'columbus-oh', 3300),
  OK: entry('OK', 'Oklahoma', 0.0475, 'Social Security exempt; other retirement partially taxable.', 0.009, 0.045, 'oklahoma-city-ok', 3000),
  OR: entry('OR', 'Oregon', 0.08, 'Social Security exempt; other retirement taxable.', 0.0087, 0, 'portland-or', 4200),
  PA: entry('PA', 'Pennsylvania', 0.0307, 'Retirement income after age 59½ largely exempt.', 0.015, 0.06, 'philadelphia-pa', 3600),
  RI: entry('RI', 'Rhode Island', 0.0599, 'Social Security exempt for many; pensions partially taxable.', 0.013, 0.07, 'providence-ri', 4000),
  SC: entry('SC', 'South Carolina', 0.064, 'Up to $15k retirement deduction (simplified).', 0.0057, 0.06, 'charleston-sc', 3300),
  SD: entry('SD', 'South Dakota', 0, 'No state income tax.', 0.012, 0.045, 'sioux-falls-sd', 3000, true),
  TN: entry('TN', 'Tennessee', 0, 'No tax on wages; Hall income tax fully repealed.', 0.0071, 0.07, 'nashville-tn', 3400, true),
  TX: entry('TX', 'Texas', 0, 'No state income tax.', 0.016, 0.0625, 'austin-tx', 3600, true),
  UT: entry('UT', 'Utah', 0.0465, 'Social Security taxable; other retirement taxable.', 0.0061, 0.0619, 'salt-lake-city-ut', 3600),
  VT: entry('VT', 'Vermont', 0.066, 'Social Security exempt for many; other retirement taxable.', 0.017, 0.06, 'burlington-vt', 3900),
  VA: entry('VA', 'Virginia', 0.0575, 'Social Security exempt; up to $12k retirement deduction age 65+.', 0.0082, 0.053, 'richmond-va', 3800),
  WA: entry('WA', 'Washington', 0, 'No state income tax.', 0.0098, 0.065, 'seattle-wa', 4500, true),
  WV: entry('WV', 'West Virginia', 0.0512, 'Social Security exempt; other retirement partially taxable.', 0.0061, 0.06, 'charleston-wv', 2800),
  WI: entry('WI', 'Wisconsin', 0.053, 'Social Security exempt for many; other retirement taxable.', 0.017, 0.05, 'madison-wi', 3400),
  WY: entry('WY', 'Wyoming', 0, 'No state income tax.', 0.0061, 0.04, 'cheyenne-wy', 3200, true),
  DC: entry('DC', 'District of Columbia', 0.065, 'Social Security exempt; other retirement taxable.', 0.0057, 0.06, 'washington-dc', 5000),
}

function entry(
  code: string,
  name: string,
  retirementIncomeRate: number,
  retirementExemptions: string,
  propertyTaxRate: number,
  salesTaxRate: number,
  teleportSlug: string,
  defaultMonthlyCostUsd: number,
  noIncomeTax = false,
): StateTaxEntry {
  const base = {
    code,
    name,
    noIncomeTax,
    retirementIncomeRate,
    retirementExemptions,
    propertyTaxRate,
    salesTaxRate,
    healthcareNotes:
      'Medicare Advantage plans widely available; supplement costs vary by county. Check network if splitting time between states.',
    teleportSlug,
    defaultMonthlyCostUsd,
    lastVerified: '2025-01',
    sourceUrl: 'https://taxfoundation.org/data/all/state/state-income-tax-rates/',
  }
  const retirementTaxDetail = getStateRetirementTaxDetail(base)
  return { ...base, retirementTaxDetail }
}

export function getStateTaxEntry(code: string): StateTaxEntry | undefined {
  return STATE_TAX_RATES[code.toUpperCase()]
}
