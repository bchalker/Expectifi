import type { CalculatorInputs } from './computeResults'
import {
  benefitAtClaimAgeFromMonthlyAt67,
  clampClaimAge,
  isSsConfigured,
  monthlyAt67FromBenefitAtClaimAge,
  resolveSpouseBenefit,
  resolveUserEstimates,
  ssTripletFromMonthlyAt67,
} from './socialSecurity'
import { formatMoney } from './displayCurrency'

/** Government + supplemental guaranteed income entry types. */
export type GuaranteedIncomeEntryType =
  | 'ss'
  | 'cpp'
  | 'oas'
  | 'pension'
  | 'employer-pension'
  | 'annuity'
  | 'other'

export type GuaranteedIncomeEntry = {
  id: string
  type: GuaranteedIncomeEntryType
  /** Free-text label for pension and annuity entries. */
  name?: string
  /** Monthly amount at the entry's start age. */
  monthlyAmount: number
  startAge: number
}

export const GUARANTEED_INCOME_TAB_LABEL = 'Guaranteed Income'

export const GI_ACCORDION_GOVERNMENT = 'gi-accordion-government'
export const GI_ACCORDION_PENSIONS = 'gi-accordion-pensions'
export const GI_ACCORDION_ANNUITIES = 'gi-accordion-annuities'

const US_COUNTRY = 'United States'
const CA_COUNTRY = 'Canada'

const GOV_SS_ID = 'gi-gov-ss'
const GOV_CPP_ID = 'gi-gov-cpp'
const GOV_OAS_ID = 'gi-gov-oas'

const SUMMARY_SHORT_LABELS: Record<GuaranteedIncomeEntryType, string> = {
  ss: 'SS',
  cpp: 'CPP',
  oas: 'OAS',
  pension: 'Pension',
  'employer-pension': 'Employer Pension',
  annuity: 'Annuity',
  other: 'Other',
}

let entryIdCounter = 0

export function createGuaranteedIncomeEntryId(): string {
  entryIdCounter += 1
  return `gi-${Date.now()}-${entryIdCounter}`
}

export function isCanadaResidence(country: string): boolean {
  return country.trim() === CA_COUNTRY
}

export function isUsResidence(country: string): boolean {
  return country.trim() === US_COUNTRY || !country.trim()
}

export function isPensionEntryType(type: GuaranteedIncomeEntryType): boolean {
  return type === 'pension' || type === 'employer-pension' || type === 'other'
}

export function isAnnuityEntryType(type: GuaranteedIncomeEntryType): boolean {
  return type === 'annuity'
}

export function pensionEntryTypeForCountry(country: string): 'pension' | 'employer-pension' {
  return isCanadaResidence(country) ? 'employer-pension' : 'pension'
}

function primaryGovernmentType(country: string): 'ss' | 'cpp' {
  return isCanadaResidence(country) ? 'cpp' : 'ss'
}

function monthlyFromSsFields(inputs: CalculatorInputs, startAge: number): number {
  const monthlyAt67 = inputs.ssBenefit67 > 0 ? inputs.ssBenefit67 : 0
  if (monthlyAt67 <= 0) return 0
  return benefitAtClaimAgeFromMonthlyAt67(monthlyAt67, startAge)
}

function normalizeEntry(raw: unknown): GuaranteedIncomeEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const type = o.type
  if (
    type !== 'ss' &&
    type !== 'cpp' &&
    type !== 'oas' &&
    type !== 'pension' &&
    type !== 'employer-pension' &&
    type !== 'annuity' &&
    type !== 'other'
  ) {
    return null
  }
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : createGuaranteedIncomeEntryId()
  const monthlyAmount =
    typeof o.monthlyAmount === 'number' && Number.isFinite(o.monthlyAmount)
      ? Math.max(0, Math.round(o.monthlyAmount))
      : 0
  const startAge =
    typeof o.startAge === 'number' && Number.isFinite(o.startAge)
      ? Math.round(o.startAge)
      : defaultStartAgeForType(type as GuaranteedIncomeEntryType)
  const name = typeof o.name === 'string' ? o.name : undefined
  return { id, type: type as GuaranteedIncomeEntryType, monthlyAmount, startAge, ...(name !== undefined ? { name } : {}) }
}

export function normalizeGuaranteedIncomeEntries(raw: unknown): GuaranteedIncomeEntry[] {
  if (!Array.isArray(raw)) return []
  const out: GuaranteedIncomeEntry[] = []
  for (const item of raw) {
    const entry = normalizeEntry(item)
    if (entry) out.push(entry)
  }
  return out
}

export type GuaranteedIncomePartition = {
  government: GuaranteedIncomeEntry[]
  pensions: GuaranteedIncomeEntry[]
  annuities: GuaranteedIncomeEntry[]
}

export function partitionGuaranteedIncomeEntries(
  entries: GuaranteedIncomeEntry[],
  country: string,
): GuaranteedIncomePartition {
  const isCa = isCanadaResidence(country)
  const government = isCa
    ? entries.filter((e) => e.type === 'cpp' || e.type === 'oas')
    : entries.filter((e) => e.type === 'ss')
  const pensions = entries.filter((e) => isPensionEntryType(e.type))
  const annuities = entries.filter((e) => isAnnuityEntryType(e.type))
  return { government, pensions, annuities }
}

function buildUsEntries(stored: GuaranteedIncomeEntry[], inputs: CalculatorInputs): GuaranteedIncomeEntry[] {
  const pensions = stored.filter((e) => isPensionEntryType(e.type))
  const annuities = stored.filter((e) => isAnnuityEntryType(e.type))
  const existingSs = stored.find((e) => e.type === 'ss')
  const startAge = inputs.ssAge > 0 ? inputs.ssAge : existingSs?.startAge ?? 67
  const monthlyAmount = monthlyFromSsFields(inputs, startAge)

  const ss: GuaranteedIncomeEntry = {
    id: existingSs?.id ?? GOV_SS_ID,
    type: 'ss',
    startAge,
    monthlyAmount,
  }

  return [ss, ...pensions, ...annuities]
}

function buildCanadaEntries(stored: GuaranteedIncomeEntry[], inputs: CalculatorInputs): GuaranteedIncomeEntry[] {
  const pensions = stored.filter((e) => isPensionEntryType(e.type))
  const annuities = stored.filter((e) => isAnnuityEntryType(e.type))
  const existingCpp = stored.find((e) => e.type === 'cpp')
  const existingOas = stored.find((e) => e.type === 'oas')

  const cppStartAge = inputs.ssAge > 0 ? inputs.ssAge : existingCpp?.startAge ?? 65
  const cppMonthly = monthlyFromSsFields(inputs, cppStartAge)

  const cpp: GuaranteedIncomeEntry = {
    id: existingCpp?.id ?? GOV_CPP_ID,
    type: 'cpp',
    startAge: cppStartAge,
    monthlyAmount: cppMonthly,
  }

  const oas: GuaranteedIncomeEntry = {
    id: existingOas?.id ?? GOV_OAS_ID,
    type: 'oas',
    startAge: existingOas?.startAge ?? OAS_DEFAULT_START_AGE,
    monthlyAmount: existingOas?.monthlyAmount ?? 0,
  }

  return [cpp, oas, ...pensions, ...annuities]
}

const OAS_DEFAULT_START_AGE = 65

/** Build canonical entry list from persisted inputs, migrating legacy SS-only state when needed. */
export function guaranteedIncomeEntriesFromInputs(inputs: CalculatorInputs): GuaranteedIncomeEntry[] {
  const country = inputs.residenceCountry ?? ''
  const stored = normalizeGuaranteedIncomeEntries(inputs.guaranteedIncomeEntries)

  if (stored.length > 0) {
    return isCanadaResidence(country) ? buildCanadaEntries(stored, inputs) : buildUsEntries(stored, inputs)
  }

  if (isCanadaResidence(country)) {
    return buildCanadaEntries([], inputs)
  }

  return buildUsEntries([], inputs)
}

export function patchInputsFromGuaranteedIncomeEntries(
  entries: GuaranteedIncomeEntry[],
  inputs: CalculatorInputs,
): Partial<CalculatorInputs> {
  const country = inputs.residenceCountry ?? ''
  const primaryType = primaryGovernmentType(country)
  const primary = entries.find((e) => e.type === primaryType)

  const patch: Partial<CalculatorInputs> = {
    guaranteedIncomeEntries: entries.map((e) => ({ ...e })),
  }

  if (primary && (primary.type === 'ss' || primary.type === 'cpp')) {
    const monthlyAt67 =
      primary.monthlyAmount > 0
        ? monthlyAt67FromBenefitAtClaimAge(primary.monthlyAmount, primary.startAge)
        : 0
    const triplet = monthlyAt67 > 0 ? ssTripletFromMonthlyAt67(monthlyAt67) : { b62: 0, b67: 0, b70: 0 }
    patch.ssAge = primary.startAge
    patch.ssBenefit62 = triplet.b62
    patch.ssBenefit67 = triplet.b67
    patch.ssBenefit70 = triplet.b70
  }

  return patch
}

export function entryMonthlyAmount(entry: GuaranteedIncomeEntry, inputs: CalculatorInputs): number {
  const primaryType = primaryGovernmentType(inputs.residenceCountry ?? '')
  if (entry.type === primaryType && (entry.type === 'ss' || entry.type === 'cpp')) {
    return monthlyFromSsFields(inputs, entry.startAge)
  }
  return Math.max(0, entry.monthlyAmount)
}

function configuredNamedEntries(entries: GuaranteedIncomeEntry[], inputs: CalculatorInputs): GuaranteedIncomeEntry[] {
  return entries.filter((e) => entryMonthlyAmount(e, inputs) > 0)
}

function combinedMonthlyForEntries(entries: GuaranteedIncomeEntry[], inputs: CalculatorInputs): number {
  return entries.reduce((sum, e) => sum + entryMonthlyAmount(e, inputs), 0)
}

export type GuaranteedIncomeAccordionMeta = {
  title: string
  subtitle: string
  configured: boolean
}

export function governmentAccordionTitle(country: string): string {
  return isCanadaResidence(country) ? 'CPP & OAS' : 'Social Security'
}

export function governmentAccordionMeta(
  inputs: CalculatorInputs,
): GuaranteedIncomeAccordionMeta {
  const country = inputs.residenceCountry ?? ''
  const entries = guaranteedIncomeEntriesFromInputs(inputs)
  const { government } = partitionGuaranteedIncomeEntries(entries, country)

  if (isCanadaResidence(country)) {
    const cpp = government.find((e) => e.type === 'cpp')
    const oas = government.find((e) => e.type === 'oas')
    const cppAmount = cpp ? entryMonthlyAmount(cpp, inputs) : 0
    const oasAmount = oas ? entryMonthlyAmount(oas, inputs) : 0
    const total = cppAmount + oasAmount

    if (total <= 0) {
      return {
        title: governmentAccordionTitle(country),
        subtitle: 'Not configured',
        configured: false,
      }
    }

    const parts: string[] = []
    if (cppAmount > 0 && cpp) parts.push(`CPP at ${cpp.startAge}`)
    if (oasAmount > 0 && oas) parts.push(`OAS at ${oas.startAge}`)
    return {
      title: governmentAccordionTitle(country),
      subtitle: `${parts.join(' · ')} · ${formatMoney(total)}/mo`,
      configured: true,
    }
  }

  const ss = government.find((e) => e.type === 'ss')
  const amount = ss ? entryMonthlyAmount(ss, inputs) : 0
  if (amount <= 0 || !ss) {
    return {
      title: governmentAccordionTitle(country),
      subtitle: 'Not configured',
      configured: false,
    }
  }

  return {
    title: governmentAccordionTitle(country),
    subtitle: `At ${ss.startAge} · ${formatMoney(amount)}/mo`,
    configured: true,
  }
}

export function pensionsAccordionMeta(inputs: CalculatorInputs): GuaranteedIncomeAccordionMeta {
  const country = inputs.residenceCountry ?? ''
  const entries = guaranteedIncomeEntriesFromInputs(inputs)
  const { pensions } = partitionGuaranteedIncomeEntries(entries, country)
  const configured = configuredNamedEntries(pensions, inputs)
  const total = combinedMonthlyForEntries(configured, inputs)

  if (configured.length === 0 || total <= 0) {
    return { title: 'Pensions', subtitle: 'Not configured', configured: false }
  }

  const countLabel = configured.length === 1 ? '1 pension' : `${configured.length} pensions`
  return {
    title: 'Pensions',
    subtitle: `${countLabel} · ${formatMoney(total)}/mo`,
    configured: true,
  }
}

export function annuitiesAccordionMeta(inputs: CalculatorInputs): GuaranteedIncomeAccordionMeta {
  const entries = guaranteedIncomeEntriesFromInputs(inputs)
  const { annuities } = partitionGuaranteedIncomeEntries(entries, inputs.residenceCountry ?? '')
  const configured = configuredNamedEntries(annuities, inputs)
  const total = combinedMonthlyForEntries(configured, inputs)

  if (configured.length === 0 || total <= 0) {
    return { title: 'Annuities', subtitle: 'Not configured', configured: false }
  }

  const countLabel = configured.length === 1 ? '1 annuity' : `${configured.length} annuities`
  return {
    title: 'Annuities',
    subtitle: `${countLabel} · ${formatMoney(total)}/mo`,
    configured: true,
  }
}

export function isGuaranteedIncomeConfigured(inputs: CalculatorInputs): boolean {
  if (isSsConfigured(inputs)) return true
  const entries = guaranteedIncomeEntriesFromInputs(inputs)
  return entries.some((e) => entryMonthlyAmount(e, inputs) > 0)
}

export function guaranteedIncomeCombinedMonthly(inputs: CalculatorInputs): number {
  const entries = guaranteedIncomeEntriesFromInputs(inputs)
  return entries.reduce((sum, e) => sum + entryMonthlyAmount(e, inputs), 0)
}

export type GuaranteedIncomeSource = {
  id: string
  type: GuaranteedIncomeEntryType | 'spouse-ss'
  shortLabel: string
  startAge: number
  monthlyAmount: number
}

function guaranteedIncomeShortLabel(
  entry: GuaranteedIncomeEntry,
  country: string,
): string {
  if (entry.type === 'pension' || entry.type === 'employer-pension' || entry.type === 'other') {
    const name = entry.name?.trim()
    if (name) return name
    return isCanadaResidence(country) && entry.type === 'employer-pension'
      ? 'Employer Pension'
      : 'Pension'
  }
  return SUMMARY_SHORT_LABELS[entry.type] ?? entry.type
}

/** All configured guaranteed income sources, including spouse SS when applicable. */
export function guaranteedIncomeSourcesFromInputs(
  inputs: CalculatorInputs,
): GuaranteedIncomeSource[] {
  const country = inputs.residenceCountry ?? ''
  const entries = guaranteedIncomeEntriesFromInputs(inputs)
  const sources: GuaranteedIncomeSource[] = []

  for (const entry of entries) {
    const monthlyAmount = entryMonthlyAmount(entry, inputs)
    if (monthlyAmount <= 0) continue
    sources.push({
      id: entry.id,
      type: entry.type,
      shortLabel: guaranteedIncomeShortLabel(entry, country),
      startAge: entry.startAge,
      monthlyAmount,
    })
  }

  if (inputs.married && !isCanadaResidence(country)) {
    const userEst = resolveUserEstimates(inputs)
    const spouse = resolveSpouseBenefit(inputs, userEst)
    if (spouse.monthly > 0) {
      sources.push({
        id: 'spouse-ss',
        type: 'spouse-ss',
        shortLabel: 'Spouse SS',
        startAge: clampClaimAge(inputs.spouseClaimAge),
        monthlyAmount: spouse.monthly,
      })
    }
  }

  return sources
}

/** Monthly guaranteed income active at a given age in the projection timeline. */
export function guaranteedIncomeMonthlyAtAge(
  inputs: CalculatorInputs,
  age: number,
): number {
  return guaranteedIncomeSourcesFromInputs(inputs)
    .filter((source) => source.startAge <= age)
    .reduce((sum, source) => sum + source.monthlyAmount, 0)
}

/** US Social Security (user + spouse) active at a given age — for treaty Art. 20 France tax. */
export function guaranteedSsMonthlyAtAge(
  inputs: CalculatorInputs,
  age: number,
): number {
  return guaranteedIncomeSourcesFromInputs(inputs)
    .filter(
      (source) =>
        (source.type === 'ss' || source.type === 'spouse-ss') &&
        source.startAge <= age,
    )
    .reduce((sum, source) => sum + source.monthlyAmount, 0)
}

export type FutureGuaranteedIncomeNote = {
  monthlyAmount: number
  startAge: number
  shortLabel: string
}

/** Nearest future guaranteed income source after retirement — for hero secondary note. */
export function guaranteedIncomeFutureHeroNote(
  inputs: CalculatorInputs,
  retirementAge: number,
): FutureGuaranteedIncomeNote | null {
  const future = guaranteedIncomeSourcesFromInputs(inputs).filter(
    (source) => source.monthlyAmount > 0 && source.startAge > retirementAge,
  )
  if (future.length === 0) return null

  const nearestStartAge = Math.min(...future.map((source) => source.startAge))
  const atNearest = future.filter((source) => source.startAge === nearestStartAge)
  const monthlyAmount = atNearest.reduce((sum, source) => sum + source.monthlyAmount, 0)
  const shortLabel =
    atNearest.length === 1 ? atNearest[0]!.shortLabel : 'guaranteed income'

  return { monthlyAmount, startAge: nearestStartAge, shortLabel }
}

export type GuaranteedIncomeTooltipRow = {
  id: string
  label: string
  monthlyAmount: number
  startAge: number
}

export type GuaranteedIncomeTooltipModel = {
  rows: GuaranteedIncomeTooltipRow[]
}

function guaranteedIncomeTooltipRowLabel(source: GuaranteedIncomeSource): string {
  if (source.type === 'ss') return 'Social Security'
  if (source.type === 'spouse-ss') return 'Spouse Social Security'
  if (source.type === 'cpp') return 'CPP'
  if (source.type === 'oas') return 'OAS'
  return source.shortLabel
}

/** Hover summary rows for the guaranteed income config link. */
export function guaranteedIncomeTooltipModel(
  inputs: CalculatorInputs,
): GuaranteedIncomeTooltipModel {
  const rows = guaranteedIncomeSourcesFromInputs(inputs)
    .filter((source) => source.monthlyAmount > 0)
    .map((source) => ({
      id: source.id,
      label: guaranteedIncomeTooltipRowLabel(source),
      monthlyAmount: source.monthlyAmount,
      startAge: source.startAge,
    }))

  return { rows }
}

/** Subheader muted summary across all three accordions. */
export function guaranteedIncomeSubheaderSummary(inputs: CalculatorInputs): string {
  const country = inputs.residenceCountry ?? ''
  const entries = guaranteedIncomeEntriesFromInputs(inputs)
  const { government, pensions, annuities } = partitionGuaranteedIncomeEntries(entries, country)
  const parts: string[] = []

  if (isCanadaResidence(country)) {
    const cpp = government.find((e) => e.type === 'cpp')
    const oas = government.find((e) => e.type === 'oas')
    if (cpp && entryMonthlyAmount(cpp, inputs) > 0) parts.push(`CPP at ${cpp.startAge}`)
    if (oas && entryMonthlyAmount(oas, inputs) > 0) parts.push(`OAS at ${oas.startAge}`)
  } else {
    const ss = government.find((e) => e.type === 'ss')
    if (ss && entryMonthlyAmount(ss, inputs) > 0) parts.push(`SS at ${ss.startAge}`)
  }

  const configuredPensions = configuredNamedEntries(pensions, inputs)
  if (configuredPensions.length === 1) {
    parts.push('1 pension')
  } else if (configuredPensions.length > 1) {
    parts.push(`${configuredPensions.length} pensions`)
  }

  const configuredAnnuities = configuredNamedEntries(annuities, inputs)
  if (configuredAnnuities.length === 1) {
    parts.push('1 annuity')
  } else if (configuredAnnuities.length > 1) {
    parts.push(`${configuredAnnuities.length} annuities`)
  }

  const total = guaranteedIncomeCombinedMonthly(inputs)
  if (parts.length === 0 || total <= 0) return ''

  const amountLabel = `${formatMoney(total)}/mo`
  if (parts.length === 1) {
    return `${parts[0]} · ${amountLabel}`
  }
  return `${parts.join(' · ')} · ${amountLabel} combined`
}

export function defaultStartAgeForType(type: GuaranteedIncomeEntryType): number {
  if (type === 'oas') return 65
  if (type === 'cpp') return 65
  if (type === 'ss') return 67
  return 65
}

export function startAgeRangeForType(type: GuaranteedIncomeEntryType): { min: number; max: number } {
  if (type === 'ss') return { min: 62, max: 70 }
  if (type === 'cpp') return { min: 60, max: 70 }
  if (type === 'oas') return { min: 65, max: 70 }
  return { min: 55, max: 75 }
}

/** Pension, annuity, and other supplemental entries — min is at least the user's current age. */
export function supplementalStartAgeRange(currentAge: number): { min: number; max: number } {
  const age = Math.max(0, Math.round(currentAge))
  const min = Math.max(startAgeRangeForType('pension').min, age)
  const max = Math.max(startAgeRangeForType('pension').max, min)
  return { min, max }
}

export function createBlankPensionEntry(country: string): GuaranteedIncomeEntry {
  return {
    id: createGuaranteedIncomeEntryId(),
    type: pensionEntryTypeForCountry(country),
    name: '',
    monthlyAmount: 0,
    startAge: 65,
  }
}

export function createBlankAnnuityEntry(): GuaranteedIncomeEntry {
  return {
    id: createGuaranteedIncomeEntryId(),
    type: 'annuity',
    name: '',
    monthlyAmount: 0,
    startAge: 65,
  }
}

/** @deprecated Legacy label helper — prefer accordion-specific titles. */
export function guaranteedIncomeTypeLabel(type: GuaranteedIncomeEntryType): string {
  return SUMMARY_SHORT_LABELS[type] ?? type
}
