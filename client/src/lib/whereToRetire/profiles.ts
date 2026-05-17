import { getCountryTaxEntry } from '../../data/countryTaxRates'
import { getDestinationResources } from '../../data/destinationResources'
import type { RetirementTaxDetail } from '../../data/retirementTaxDetail'
import { getStateTaxEntry } from '../../data/stateTaxRates'
import type { ResourceLink } from '../../data/destinationResources'
import { getUsdExchangeHistory, type DollarStrengthSeries } from '../api/exchangeRates'
import {
  buildColBreakdown,
  buildQolBreakdown,
  getTeleportMonthlyLivingCost,
  getTeleportProfile,
  type TeleportScoreCategory,
} from '../api/teleport'
import { getWorldBankCountryIndicators } from '../api/worldBank'
import { cacheStoredAt } from '../api/apiCache'

export type DestinationProfile = {
  kind: 'country' | 'us-state'
  name: string
  code: string
  monthlySurplus: number
  afterTaxMonthly: number
  livingCost: number
  estimatedLivingCostUsd: number
  estimatedLivingCostLabel: string
  taxRateLabel: string
  retirementTaxDetail: RetirementTaxDetail
  exemptionNotes: string
  visaNotes: string
  healthcareNotes: string
  colIndex: number | null
  colBreakdown: TeleportScoreCategory[]
  qolScore: number | null
  qolBreakdown: TeleportScoreCategory[]
  colScoreSource: 'Teleport' | 'Estimate'
  currencyCode: string | null
  dollarStrength: DollarStrengthSeries | null
  resources: ResourceLink[]
  dataFreshnessLabel: string
  teleportSlug: string
}

function freshnessFromTimestamps(timestamps: (number | null)[]): string {
  const valid = timestamps.filter((t): t is number => t != null)
  if (!valid.length) return 'Live estimate'
  const oldest = Math.min(...valid)
  const ageH = Math.floor((Date.now() - oldest) / (60 * 60 * 1000))
  if (ageH < 1) return 'Data refreshed recently'
  if (ageH < 24) return `Data ${ageH}h old`
  return 'Cached data — up to 24h'
}

export async function getStateProfile(
  stateCode: string,
  _city: string | null,
  monthlyCost: number,
  grossMonthlyIncome: number,
): Promise<DestinationProfile | null> {
  const state = getStateTaxEntry(stateCode)
  if (!state) return null

  const rate = state.noIncomeTax ? 0 : state.retirementIncomeRate
  const localTax = grossMonthlyIncome * rate
  const afterTax = grossMonthlyIncome - localTax
  const surplus = afterTax - monthlyCost

  const [teleport, livingCostEstimate] = await Promise.all([
    getTeleportProfile(state.teleportSlug),
    getTeleportMonthlyLivingCost(state.teleportSlug, state.defaultMonthlyCostUsd),
  ])
  const tpAge = cacheStoredAt('teleport', `scores:v3:${state.teleportSlug}`)

  return {
    kind: 'us-state',
    name: state.name,
    code: state.code,
    monthlySurplus: surplus,
    afterTaxMonthly: afterTax,
    livingCost: monthlyCost,
    estimatedLivingCostUsd: livingCostEstimate.monthlyUsd,
    estimatedLivingCostLabel:
      livingCostEstimate.source === 'api' ? 'Teleport estimate' : 'Catalog estimate',
    taxRateLabel: state.noIncomeTax ? 'No state income tax' : `${(rate * 100).toFixed(1)}% (est.)`,
    retirementTaxDetail: state.retirementTaxDetail,
    exemptionNotes: state.retirementExemptions,
    visaNotes: 'N/A — US state',
    healthcareNotes: state.healthcareNotes,
    colIndex: teleport.colIndex,
    colBreakdown: buildColBreakdown(teleport),
    qolScore: teleport.qolScore,
    qolBreakdown: buildQolBreakdown(teleport),
    colScoreSource: teleport.source === 'api' ? 'Teleport' : 'Estimate',
    currencyCode: 'USD',
    dollarStrength: null,
    resources: getDestinationResources('us-state', state.code),
    dataFreshnessLabel:
      teleport.source === 'fallback' ? 'COL/QoL estimates (Teleport API unavailable)' : freshnessFromTimestamps([tpAge]),
    teleportSlug: state.teleportSlug,
  }
}

export async function getDestinationProfile(
  countryCode: string,
  monthlyCost: number,
  grossMonthlyIncome: number,
): Promise<DestinationProfile | null> {
  const country = getCountryTaxEntry(countryCode)
  if (!country) return null

  const rate = country.effectiveRetirementRate
  const localTax = grossMonthlyIncome * rate
  const afterTax = grossMonthlyIncome - localTax
  const surplus = afterTax - monthlyCost

  const [teleport, livingCostEstimate, dollarStrength, _wb] = await Promise.all([
    getTeleportProfile(country.teleportSlug),
    getTeleportMonthlyLivingCost(country.teleportSlug, country.defaultMonthlyCostUsd),
    country.currencyCode !== 'USD'
      ? getUsdExchangeHistory(country.currencyCode)
      : Promise.resolve(null),
    getWorldBankCountryIndicators(country.code),
  ])

  const tpAge = cacheStoredAt('teleport', `scores:v3:${country.teleportSlug}`)
  const fxAge =
    country.currencyCode !== 'USD'
      ? cacheStoredAt('exchangerate', `usd-v2-${country.currencyCode.toUpperCase()}`)
      : null

  const taxLabel =
    rate === 0
      ? '0% on gross (est.)'
      : `${(rate * 100).toFixed(0)}% on gross (est.)`

  return {
    kind: 'country',
    name: country.name,
    code: country.code,
    monthlySurplus: surplus,
    afterTaxMonthly: afterTax,
    livingCost: monthlyCost,
    estimatedLivingCostUsd: livingCostEstimate.monthlyUsd,
    estimatedLivingCostLabel:
      livingCostEstimate.source === 'api' ? 'Teleport estimate' : 'Catalog estimate',
    taxRateLabel: taxLabel,
    retirementTaxDetail: country.retirementTaxDetail,
    exemptionNotes: `${country.rateDescription} ${country.usExpatNotes}`,
    visaNotes: country.visaNotes,
    healthcareNotes: country.healthcareNotes,
    colIndex: teleport.colIndex,
    colBreakdown: buildColBreakdown(teleport),
    qolScore: teleport.qolScore,
    qolBreakdown: buildQolBreakdown(teleport),
    colScoreSource: teleport.source === 'api' ? 'Teleport' : 'Estimate',
    currencyCode: country.currencyCode,
    dollarStrength,
    resources: getDestinationResources('country', country.code),
    dataFreshnessLabel:
      teleport.source === 'fallback'
        ? 'COL/QoL estimates (Teleport API unavailable)'
        : freshnessFromTimestamps([tpAge, fxAge]),
    teleportSlug: country.teleportSlug,
  }
}

export async function loadProfileForKey(
  key: string,
  monthlyCost: number,
  grossMonthlyIncome: number,
): Promise<DestinationProfile | null> {
  if (key.startsWith('state:')) {
    return getStateProfile(key.slice(6), null, monthlyCost, grossMonthlyIncome)
  }
  if (key.startsWith('country:')) {
    return getDestinationProfile(key.slice(8), monthlyCost, grossMonthlyIncome)
  }
  return null
}
