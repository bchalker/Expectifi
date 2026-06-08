import { fmtInput } from '../utils/format'

export type Us401kContributions = {
  roth: number
  traditional: number
  employerMatchPct: number
  employerMatchCapPct: number
}

export type UsSplitContributions = {
  roth: number
  traditional: number
}

export type UsContributions = {
  k401: Us401kContributions
  ira: UsSplitContributions
  sep: UsSplitContributions
  hsa: number
}

export type CaContributions = {
  rrsp: number
  employerPensionPct: number
  tfsa: number
  employerPension: number
}

export type OnboardingContributionsState =
  | { region: 'us'; us: UsContributions }
  | { region: 'ca'; ca: CaContributions }

export function emptyUsContributions(): UsContributions {
  return {
    k401: { roth: 0, traditional: 0, employerMatchPct: 0, employerMatchCapPct: 0 },
    ira: { roth: 0, traditional: 0 },
    sep: { roth: 0, traditional: 0 },
    hsa: 0,
  }
}

export function emptyCaContributions(): CaContributions {
  return {
    rrsp: 0,
    employerPensionPct: 0,
    tfsa: 0,
    employerPension: 0,
  }
}

export function emptyContributionsForRegion(
  region: 'us' | 'ca',
): OnboardingContributionsState {
  return region === 'us'
    ? { region: 'us', us: emptyUsContributions() }
    : { region: 'ca', ca: emptyCaContributions() }
}

export function isCatchUpEligible(dob: string): boolean {
  const year = Number.parseInt(dob.slice(0, 4), 10)
  if (!Number.isFinite(year)) return false
  return new Date().getFullYear() - year >= 50
}

export function us401kAnnualLimit(catchUp: boolean): number {
  return catchUp ? 31_000 : 23_500
}

export function usIraAnnualLimit(catchUp: boolean): number {
  return catchUp ? 8_000 : 7_000
}

export function usSepAnnualLimit(): number {
  return 70_000
}

export function usHsaAnnualLimit(): number {
  return 4_300
}

export function caRrspAnnualLimit(): number {
  return 31_560
}

export function caTfsaAnnualLimit(): number {
  return 7_000
}

export function annualToMonthlyLimit(annual: number): number {
  return Math.round(annual / 12)
}

export function formatMonthlyLimit(annual: number): string {
  return `$${fmtInput(annualToMonthlyLimit(annual))}/mo`
}

export function formatMonthlyAmount(amount: number): string {
  return `$${fmtInput(Math.max(0, Math.round(amount)))}/mo`
}

export function splitPairMonthlyTotal(pair: UsSplitContributions): number {
  return Math.max(0, Math.round(pair.roth)) + Math.max(0, Math.round(pair.traditional))
}

export function maxFillRemainder(limitMonthly: number, otherField: number): number {
  return Math.max(0, limitMonthly - Math.max(0, Math.round(otherField)))
}

export function isOverSplitLimit(
  pair: UsSplitContributions,
  limitMonthly: number,
): boolean {
  return splitPairMonthlyTotal(pair) > limitMonthly
}

export function us401kMonthlyTotal(k401: Us401kContributions): number {
  return splitPairMonthlyTotal({ roth: k401.roth, traditional: k401.traditional })
}

export function totalUsContributionsMonthly(us: UsContributions): number {
  return (
    us401kMonthlyTotal(us.k401) +
    splitPairMonthlyTotal(us.ira) +
    splitPairMonthlyTotal(us.sep) +
    Math.max(0, Math.round(us.hsa))
  )
}

export function totalCaContributionsMonthly(ca: CaContributions): number {
  return (
    Math.max(0, Math.round(ca.rrsp)) +
    Math.max(0, Math.round(ca.tfsa)) +
    Math.max(0, Math.round(ca.employerPension))
  )
}

export function totalContributionsMonthly(
  state: OnboardingContributionsState,
): number {
  return state.region === 'us'
    ? totalUsContributionsMonthly(state.us)
    : totalCaContributionsMonthly(state.ca)
}

export function parseStoredContributions(
  raw: unknown,
  region: 'us' | 'ca',
): OnboardingContributionsState {
  if (!raw || typeof raw !== 'object') return emptyContributionsForRegion(region)
  const o = raw as Record<string, unknown>
  if (region === 'us') {
    const us = o.us
    if (!us || typeof us !== 'object') return emptyContributionsForRegion('us')
    const u = us as Record<string, unknown>
    const num = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0
    const split = (v: unknown): UsSplitContributions => {
      if (!v || typeof v !== 'object') return { roth: 0, traditional: 0 }
      const s = v as Record<string, unknown>
      return { roth: num(s.roth), traditional: num(s.traditional) }
    }
    const k401raw = u.k401
    const k401 =
      k401raw && typeof k401raw === 'object'
        ? (() => {
            const k = k401raw as Record<string, unknown>
            return {
              roth: num(k.roth),
              traditional: num(k.traditional),
              employerMatchPct: num(k.employerMatchPct),
              employerMatchCapPct: num(k.employerMatchCapPct),
            }
          })()
        : emptyUsContributions().k401
    return {
      region: 'us',
      us: {
        k401,
        ira: split(u.ira),
        sep: split(u.sep),
        hsa: num(u.hsa),
      },
    }
  }
  const ca = o.ca
  if (!ca || typeof ca !== 'object') return emptyContributionsForRegion('ca')
  const c = ca as Record<string, unknown>
  const num = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0
  return {
    region: 'ca',
    ca: {
      rrsp: num(c.rrsp),
      employerPensionPct: num(c.employerPensionPct),
      tfsa: num(c.tfsa),
      employerPension: num(c.employerPension),
    },
  }
}

export function serializeContributions(
  state: OnboardingContributionsState,
): Record<string, unknown> {
  if (state.region === 'us') return { us: state.us }
  return { ca: state.ca }
}
