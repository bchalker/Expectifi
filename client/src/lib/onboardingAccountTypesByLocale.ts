import type { OnboardingRegionId } from './onboardingRegions'
import { loadUserProfile } from './userProfileStorage'
import type { ManualAccountTypeMeta, OnboardingAccountType } from './manualAccountEntries'

export type AccountTypesLocaleKey = 'us' | 'uk' | 'de' | 'fr' | 'es' | 'it' | 'eu'

type LocaleAccountDef = {
  id: OnboardingAccountType
  label: string
  tone: ManualAccountTypeMeta['tone']
  withdrawalBucket: ManualAccountTypeMeta['withdrawalBucket']
  taxKind: string
  taxDesc: string
}

function def(
  id: OnboardingAccountType,
  label: string,
  tone: ManualAccountTypeMeta['tone'],
  withdrawalBucket: ManualAccountTypeMeta['withdrawalBucket'],
  taxKind: string,
  taxDesc: string,
): LocaleAccountDef {
  return { id, label, tone, withdrawalBucket, taxKind, taxDesc }
}

const US_ACCOUNTS: LocaleAccountDef[] = [
  def('brokerage', 'Brokerage', 'taxable', 'brokerage', 'Taxable', 'After-tax, capital gains apply'),
  def(
    'pretax_401k_ira',
    'Pre-tax 401k/IRA',
    'trad',
    'pretax',
    'Traditional',
    'Pre-tax contributions, taxed on withdrawal',
  ),
  def(
    'roth_ira',
    'Roth IRA',
    'roth',
    'roth',
    'Tax-free growth',
    'After-tax contributions, tax-free withdrawals',
  ),
  def(
    'hsa',
    'HSA',
    'hsa',
    'hsa',
    'Triple tax-advantaged',
    'Triple tax advantaged if used for healthcare',
  ),
  def(
    'pension',
    'Pension (defined benefit)',
    'trad',
    'pretax',
    'Traditional',
    "Defined benefit, we'll factor in your monthly payment",
  ),
]

const UK_ACCOUNTS: LocaleAccountDef[] = [
  def(
    'uk_workplace_pension',
    'Workplace pension',
    'trad',
    'pretax',
    'Traditional',
    'Employer-sponsored pension, taxed on withdrawal',
  ),
  def('uk_sipp', 'SIPP', 'trad', 'pretax', 'Traditional', 'Self-invested personal pension'),
  def('uk_isa', 'ISA', 'roth', 'roth', 'Tax-free growth', 'Tax-free growth and withdrawals'),
  def('uk_lisa', 'Lifetime ISA', 'roth', 'roth', 'Tax-free growth', 'Tax-free for first home or retirement'),
  def(
    'uk_defined_benefit',
    'Defined benefit / final salary',
    'trad',
    'pretax',
    'Traditional',
    'Employer pension based on salary and years of service',
  ),
]

const DE_ACCOUNTS: LocaleAccountDef[] = [
  def(
    'de_gesetzliche_rente',
    'Gesetzliche Rente (statutory)',
    'trad',
    'pretax',
    'State pension',
    'Statutory public pension (DRV)',
  ),
  def(
    'de_bav',
    'Betriebliche Altersversorgung (bAV)',
    'trad',
    'pretax',
    'Traditional',
    'Occupational pension through employer',
  ),
  def('de_riester', 'Riester-Rente', 'trad', 'pretax', 'Traditional', 'Subsidized private retirement savings'),
  def('de_ruerup', 'Rürup-Rente', 'trad', 'pretax', 'Traditional', 'Basic pension for self-employed'),
  def('de_etf_depot', 'ETF Depot (taxable)', 'taxable', 'brokerage', 'Taxable', 'Taxable investment account'),
]

const FR_ACCOUNTS: LocaleAccountDef[] = [
  def('fr_retraite_base', 'Retraite de base', 'trad', 'pretax', 'State pension', 'Basic state pension'),
  def(
    'fr_agirc_arrco',
    'Retraite complémentaire AGIRC-ARRCO',
    'trad',
    'pretax',
    'Traditional',
    'Supplementary occupational pension',
  ),
  def(
    'fr_per',
    "Plan d'épargne retraite (PER)",
    'trad',
    'pretax',
    'Traditional',
    'Individual retirement savings plan',
  ),
  def('fr_assurance_vie', 'Assurance-vie', 'taxable', 'brokerage', 'Taxable', 'Life insurance savings wrapper'),
  def('fr_pea', 'PEA', 'taxable', 'brokerage', 'Tax-advantaged', 'Equity savings plan'),
]

const ES_ACCOUNTS: LocaleAccountDef[] = [
  def(
    'es_pension_publica',
    'Pensión pública (Seguridad Social)',
    'trad',
    'pretax',
    'State pension',
    'Public social security pension',
  ),
  def('es_plan_pensiones', 'Plan de Pensiones', 'trad', 'pretax', 'Traditional', 'Private pension plan'),
  def('es_pias', 'PIAS', 'roth', 'roth', 'Tax-advantaged', 'Individual systematic savings plan'),
  def('es_cuenta_valores', 'Cuenta de valores', 'taxable', 'brokerage', 'Taxable', 'Securities account'),
  def('es_sialp', 'SIALP', 'roth', 'roth', 'Tax-advantaged', 'Individual long-term savings plan'),
]

const IT_ACCOUNTS: LocaleAccountDef[] = [
  def(
    'it_pensione_pubblica',
    'Pensione pubblica (INPS)',
    'trad',
    'pretax',
    'State pension',
    'Public pension from INPS',
  ),
  def('it_fondo_pensione', 'Fondo Pensione', 'trad', 'pretax', 'Traditional', 'Occupational pension fund'),
  def('it_pip', 'PIP (Piano Individuale Pensionistico)', 'trad', 'pretax', 'Traditional', 'Individual pension plan'),
  def('it_conto_titoli', 'Conto Titoli', 'taxable', 'brokerage', 'Taxable', 'Securities account'),
]

const EU_ACCOUNTS: LocaleAccountDef[] = [
  def('int_occupational_pension', 'Occupational pension', 'trad', 'pretax', 'Traditional', 'Employer pension plan'),
  def('int_private_pension', 'Private pension', 'trad', 'pretax', 'Traditional', 'Personal pension savings'),
  def('int_state_pension', 'State pension', 'trad', 'pretax', 'State pension', 'Government retirement benefit'),
  def('int_investment_account', 'Investment account', 'taxable', 'brokerage', 'Taxable', 'Taxable investment account'),
  def('int_savings_account', 'Savings account', 'taxable', 'brokerage', 'Taxable', 'Cash or savings balance'),
]

export const LOCALE_ACCOUNT_TYPE_DEFS: Record<AccountTypesLocaleKey, LocaleAccountDef[]> = {
  us: US_ACCOUNTS,
  uk: UK_ACCOUNTS,
  de: DE_ACCOUNTS,
  fr: FR_ACCOUNTS,
  es: ES_ACCOUNTS,
  it: IT_ACCOUNTS,
  eu: EU_ACCOUNTS,
}

export function toAccountTypesLocaleKey(
  locale: OnboardingRegionId | null | undefined,
): AccountTypesLocaleKey {
  if (!locale || locale === 'other' || locale === 'other-europe') return 'eu'
  if (locale in LOCALE_ACCOUNT_TYPE_DEFS) return locale as AccountTypesLocaleKey
  return 'us'
}

export function resolveOnboardingAccountLocale(): OnboardingRegionId {
  const profile = loadUserProfile()
  return profile?.locale ?? 'us'
}

function localeDefToMeta(definition: LocaleAccountDef): ManualAccountTypeMeta {
  return {
    id: definition.id,
    label: definition.label,
    taxHelper: definition.taxDesc,
    taxKind: definition.taxKind,
    taxDesc: definition.taxDesc,
    tone: definition.tone,
    withdrawalBucket: definition.withdrawalBucket,
  }
}

export function getLocaleAccountTypeOptions(
  locale: OnboardingRegionId | null | undefined,
): ManualAccountTypeMeta[] {
  const key = toAccountTypesLocaleKey(locale)
  return LOCALE_ACCOUNT_TYPE_DEFS[key].map(localeDefToMeta)
}

export function buildLocaleAccountTypeMetaMap(): Record<OnboardingAccountType, ManualAccountTypeMeta> {
  const map = {} as Record<OnboardingAccountType, ManualAccountTypeMeta>
  for (const defs of Object.values(LOCALE_ACCOUNT_TYPE_DEFS)) {
    for (const definition of defs) {
      map[definition.id] = localeDefToMeta(definition)
    }
  }
  return map
}

/** Maps account type id → aggregateManualAccountsToBases bucket field. */
export type ManualAccountAggregateBucket =
  | 'base401k'
  | 'baseSE401k'
  | 'baseTradIRA'
  | 'baseRoth'
  | 'baseHsa'
  | 'brkBal'

export const ACCOUNT_TYPE_AGGREGATE_BUCKET: Partial<
  Record<OnboardingAccountType, ManualAccountAggregateBucket>
> = {
  // US
  brokerage: 'brkBal',
  pretax_401k_ira: 'base401k',
  roth_ira: 'baseRoth',
  hsa: 'baseHsa',
  pension: 'baseTradIRA',
  // Legacy US ids
  trad_401k: 'base401k',
  sep_ira: 'baseSE401k',
  trad_ira: 'baseTradIRA',
  roth_401k: 'baseRoth',
  other: 'baseTradIRA',
  // UK
  uk_workplace_pension: 'base401k',
  uk_sipp: 'baseTradIRA',
  uk_isa: 'baseRoth',
  uk_lisa: 'baseRoth',
  uk_defined_benefit: 'baseTradIRA',
  // DE
  de_gesetzliche_rente: 'baseTradIRA',
  de_bav: 'base401k',
  de_riester: 'baseTradIRA',
  de_ruerup: 'baseTradIRA',
  de_etf_depot: 'brkBal',
  // FR
  fr_retraite_base: 'baseTradIRA',
  fr_agirc_arrco: 'base401k',
  fr_per: 'baseTradIRA',
  fr_assurance_vie: 'brkBal',
  fr_pea: 'brkBal',
  // ES
  es_pension_publica: 'baseTradIRA',
  es_plan_pensiones: 'baseTradIRA',
  es_pias: 'baseRoth',
  es_cuenta_valores: 'brkBal',
  es_sialp: 'baseRoth',
  // IT
  it_pensione_pubblica: 'baseTradIRA',
  it_fondo_pensione: 'base401k',
  it_pip: 'baseTradIRA',
  it_conto_titoli: 'brkBal',
  // EU / other
  int_occupational_pension: 'base401k',
  int_private_pension: 'baseTradIRA',
  int_state_pension: 'baseTradIRA',
  int_investment_account: 'brkBal',
  int_savings_account: 'brkBal',
}
