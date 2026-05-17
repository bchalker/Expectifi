import type { RetirementTaxDetail } from './retirementTaxDetail'

type StateDetailInput = {
  code: string
  name: string
  noIncomeTax: boolean
  retirementIncomeRate: number
  retirementExemptions: string
  lastVerified: string
  sourceUrl: string
}

function noStateIncomeTaxDetail(state: StateDetailInput): RetirementTaxDetail {
  return {
    localRateLabel: 'No state income tax',
    localRateHeadline: 'No state income tax',
    usFederalApplies: true,
    taxTreatyWithUS: false,
    foreignTaxCreditApplies: false,
    territorialSystem: false,
    effectiveCombinedNote: 'Only US federal income tax applies.',
    retirementIncomeBreakdown: {
      socialSecurity: 'Federal rules apply',
      retirement401k: 'Federal rules apply',
      pension: 'Federal rules apply',
      investmentIncome: 'Federal rules apply',
    },
    plainLanguageSummary: `${state.name} has no state income tax, so your retirement income is generally subject only to US federal tax. This makes ${state.name} one of the more tax-friendly states for retirees, though property tax, sales tax, and other fees still apply.`,
    lastVerified: state.lastVerified,
    sourceUrl: state.sourceUrl,
  }
}

function stateWithIncomeTaxDetail(state: StateDetailInput): RetirementTaxDetail {
  const ratePct = (state.retirementIncomeRate * 100).toFixed(1)
  return {
    localRateLabel: state.noIncomeTax ? 'No state income tax' : `~${ratePct}% state tax (est.)`,
    localRateHeadline: state.noIncomeTax ? 'No state income tax' : `${ratePct}%`,
    localRateSubtitle: state.noIncomeTax ? undefined : 'state tax',
    usFederalApplies: true,
    taxTreatyWithUS: false,
    foreignTaxCreditApplies: false,
    territorialSystem: false,
    effectiveCombinedNote: `US federal tax plus ${state.name} state tax on income not exempt under state rules. State exemptions below may reduce the state portion.`,
    retirementIncomeBreakdown: {
      socialSecurity: inferSocialSecurity(state),
      retirement401k: infer401k(state),
      pension: inferPension(state),
      investmentIncome: 'Generally taxable at state rate unless specifically exempt',
    },
    plainLanguageSummary: `In ${state.name} you generally pay US federal income tax on retirement income plus state tax on amounts not covered by exemptions. ${state.retirementExemptions} Property and sales taxes are separate from this estimate.`,
    lastVerified: state.lastVerified,
    sourceUrl: state.sourceUrl,
  }
}

function inferSocialSecurity(state: StateDetailInput): string {
  const ex = state.retirementExemptions.toLowerCase()
  if (state.noIncomeTax) return 'Federal rules apply'
  if (ex.includes('social security exempt')) return 'Exempt from state tax; federal rules apply'
  if (ex.includes('social security')) return 'Partial or full state exemption may apply'
  return 'Typically taxable at state rate unless exempt'
}

function infer401k(state: StateDetailInput): string {
  const ex = state.retirementExemptions.toLowerCase()
  if (state.noIncomeTax) return 'Federal rules apply'
  if (ex.includes('retirement income largely exempt') || ex.includes('largely exempt')) {
    return 'Often exempt from state tax after qualifying age'
  }
  if (ex.includes('401k') || ex.includes('ira')) return 'See state exemption rules'
  return 'Typically taxable at state rate unless exempt'
}

function inferPension(state: StateDetailInput): string {
  const ex = state.retirementExemptions.toLowerCase()
  if (state.noIncomeTax) return 'Federal rules apply'
  if (ex.includes('pension') && ex.includes('exempt')) return 'Often partially or fully exempt'
  if (ex.includes('public pension')) return 'Public pensions may be exempt; private pensions often taxable'
  return 'Typically taxable at state rate unless exempt'
}

export function getStateRetirementTaxDetail(state: StateDetailInput): RetirementTaxDetail {
  if (state.noIncomeTax) return noStateIncomeTaxDetail(state)
  return stateWithIncomeTaxDetail(state)
}
