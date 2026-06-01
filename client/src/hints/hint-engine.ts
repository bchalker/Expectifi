import type { OnboardingRegionId } from '../lib/onboardingRegions'
import { caNonregisteredHint } from './ca/nonregistered'
import { caRrifHint } from './ca/rrif'
import { caRrspHint } from './ca/rrsp'
import { caTfsaHint } from './ca/tfsa'
import { sharedMedicalHint } from './shared/medical'
import { sharedTaxableHint } from './shared/taxable'
import { sharedTaxDeferredHint } from './shared/taxDeferred'
import { sharedTaxFreeHint } from './shared/taxFree'
import type {
  AccountHintDefinition,
  HintAccountType,
  HintContext,
  HintLocale,
  HintSegment,
  HintTaxTreatment,
} from './types'
import { usBrokerageHint } from './us/brokerage'
import { usHsaHint } from './us/hsa'
import { usPretaxHint } from './us/pretax'
import { usRothHint } from './us/roth'

const US_HINTS: Record<HintAccountType, AccountHintDefinition> = {
  brokerage: usBrokerageHint,
  pretax: usPretaxHint,
  roth: usRothHint,
  hsa: usHsaHint,
}

const CA_HINTS: Record<HintAccountType, AccountHintDefinition | null> = {
  brokerage: caNonregisteredHint,
  pretax: caRrspHint,
  roth: caTfsaHint,
  hsa: null,
}

const SHARED_BY_TREATMENT: Record<HintTaxTreatment, AccountHintDefinition> = {
  taxable: sharedTaxableHint,
  taxDeferred: sharedTaxDeferredHint,
  taxFree: sharedTaxFreeHint,
  medical: sharedMedicalHint,
}

export function onboardingRegionToHintLocale(locale: OnboardingRegionId): HintLocale {
  return locale === 'ca' ? 'CA' : 'US'
}

function localeHints(locale: HintLocale): Record<HintAccountType, AccountHintDefinition | null> {
  return locale === 'CA' ? CA_HINTS : US_HINTS
}

function pickPretaxDefinition(ctx: HintContext): AccountHintDefinition {
  if (ctx.locale === 'CA' && ctx.userAccounts.includes('ca_rrif') && !ctx.userAccounts.includes('pretax_401k_ira')) {
    return caRrifHint
  }
  const localeDef = localeHints(ctx.locale).pretax
  if (localeDef) return localeDef
  return SHARED_BY_TREATMENT.taxDeferred
}

function definitionForAccount(ctx: HintContext): AccountHintDefinition {
  const { accountType, locale } = ctx

  if (accountType === 'pretax') {
    return pickPretaxDefinition(ctx)
  }

  const map = localeHints(locale)
  const specific = map[accountType]
  if (specific) return specific

  const treatment = taxTreatmentForAccount(accountType)
  return SHARED_BY_TREATMENT[treatment]
}

function taxTreatmentForAccount(accountType: HintAccountType): HintTaxTreatment {
  switch (accountType) {
    case 'brokerage':
      return 'taxable'
    case 'pretax':
      return 'taxDeferred'
    case 'roth':
      return 'taxFree'
    case 'hsa':
      return 'medical'
    default:
      return 'taxable'
  }
}

/** Resolve personalized hint segments for a portfolio account bucket row. */
export function resolveAccountHint(ctx: HintContext): HintSegment[] | null {
  const def = definitionForAccount(ctx)
  const fn = ctx.mode === 'growth' ? def.growthHint : def.incomeHint
  const segments = fn(ctx)
  if (!segments?.length) return null
  return segments
}
