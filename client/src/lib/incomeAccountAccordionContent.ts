import type { TaxDetailedResult } from 'shared'
import type { AccountScenarioBucketId } from './accountReturnScenario'
import type { IncomeAccordionGlossaryTermId } from './incomeAccountAccordionGlossary'
import { ltcgMarginalBracketLabel } from './incomeAccountLtcgBracket'
import type { CalculatorInputs } from './computeResults'
import type { FilingStatusId } from './filingStatus'
import { normalizeCalculatorFilingStatus } from './filingStatus'
import type { OnboardingRegionId } from './onboardingRegions'
import { fmt } from '../utils/format'
import { rothConversionRoom } from 'shared'
import type { IncomeAccordionSourceLink } from './incomeAccountAccordionSources'
import {
  BROKERAGE_ACCORDION_SOURCES,
  HSA_ACCORDION_SOURCES,
  PRETAX_ACCORDION_SOURCES,
  ROTH_ACCORDION_SOURCES,
} from './incomeAccountAccordionSources'

export type IncomeAccordionPart =
  | { type: 'text'; value: string }
  | { type: 'amount'; value: string }
  | { type: 'term'; id: IncomeAccordionGlossaryTermId; label?: string }

export type IncomeAccordionSection = {
  heading: string
  parts: IncomeAccordionPart[]
}

export type IncomeAccordionStat = {
  label: string
  value: string
  valueTermId?: IncomeAccordionGlossaryTermId
}

export type IncomeAccordionContent = {
  title: string
  introParagraphs: IncomeAccordionPart[][]
  sections: IncomeAccordionSection[]
  stats: IncomeAccordionStat[]
  sources: IncomeAccordionSourceLink[]
}

export type IncomeAccountAccordionParams = {
  bucket: AccountScenarioBucketId
  retirementAge: number
  balanceAtRetirement: number
  annualDraw: number
  locale: OnboardingRegionId
  filingStatus: FilingStatusId
  tradWdAnn: number
  medicalAnnualDraw?: number
  taxDetail: TaxDetailedResult
}

const RMD_AGE = 73

function fmtAnnual(amount: number): string {
  return `${fmt(Math.round(amount))}/yr`
}

function buildBrokerageContent(p: IncomeAccountAccordionParams): IncomeAccordionContent {
  const ltcgBracket = ltcgMarginalBracketLabel(
    p.taxDetail.ordinaryIncome,
    p.taxDetail.brkGain,
    p.filingStatus,
  )

  return {
    title: '',
    introParagraphs: [],
    sections: [
      {
        heading: 'Tax treatment',
        parts: [
          {
            type: 'text',
            value:
              'Capital gains on holdings held over one year are taxed at 0%, 15%, or 20% depending on your total income that year. At your current withdrawal rate of ',
          },
          { type: 'amount', value: fmtAnnual(p.annualDraw) },
          {
            type: 'text',
            value: ' your blended rate falls in the ',
          },
          { type: 'amount', value: ltcgBracket },
          { type: 'text', value: ' bracket.' },
        ],
      },
      {
        heading: 'Overseas retirement',
        parts: [
          {
            type: 'text',
            value:
              'If retiring abroad, US capital gains tax still applies on your federal return regardless of where you live. Check with a cross-border advisor on how your country of residence taxes foreign investment income.',
          },
        ],
      },
    ],
    stats: [
      { label: `Projected balance at ${p.retirementAge}`, value: fmt(p.balanceAtRetirement) },
      { label: 'Estimated annual draw', value: fmtAnnual(p.annualDraw) },
      {
        label: 'Tax treatment',
        value: 'Long-term capital gains',
        valueTermId: 'longTermCapitalGains',
      },
    ],
    sources: BROKERAGE_ACCORDION_SOURCES,
  }
}

function buildPretaxContent(p: IncomeAccountAccordionParams): IncomeAccordionContent {
  const bracketRoom = rothConversionRoom(p.tradWdAnn, p.filingStatus)

  return {
    title: '',
    introParagraphs: [],
    sections: [
      {
        heading: 'Tax treatment',
        parts: [
          {
            type: 'text',
            value: 'Every dollar withdrawn is taxed as ',
          },
          { type: 'term', id: 'ordinaryIncome' },
          {
            type: 'text',
            value: '. At your current withdrawal rate of ',
          },
          { type: 'amount', value: fmtAnnual(p.annualDraw) },
          {
            type: 'text',
            value: ' you have approximately ',
          },
          { type: 'amount', value: fmt(Math.round(bracketRoom)) },
          {
            type: 'text',
            value: ' before hitting the next tax bracket. Consider ',
          },
          { type: 'term', id: 'rothConversion' },
          { type: 'text', value: 's in low-income years to reduce this account\'s future tax burden.' },
        ],
      },
      {
        heading: 'RMDs',
        parts: [
          { type: 'term', id: 'rmds' },
          { type: 'text', value: ' begin at age ' },
          { type: 'amount', value: String(RMD_AGE) },
          { type: 'text', value: '. Use the window between retirement and ' },
          { type: 'amount', value: String(RMD_AGE) },
          {
            type: 'text',
            value: ' to convert strategically and reduce the RMD burden later.',
          },
        ],
      },
      {
        heading: 'Early withdrawal',
        parts: [
          { type: 'text', value: 'At ' },
          { type: 'amount', value: String(p.retirementAge) },
          {
            type: 'text',
            value: ' you are past the 59½ penalty threshold. No early withdrawal penalty applies.',
          },
        ],
      },
      {
        heading: 'Medicare impact',
        parts: [
          {
            type: 'text',
            value: 'Pre-tax withdrawals count toward your ',
          },
          { type: 'term', id: 'magi' },
          {
            type: 'text',
            value: ' and can trigger Medicare ',
          },
          { type: 'term', id: 'irmaa' },
          {
            type: 'text',
            value: ' surcharges at 65. Keep annual draws below the ',
          },
          { type: 'term', id: 'magiThreshold', label: 'surcharge threshold' },
          { type: 'text', value: ' where possible.' },
        ],
      },
      {
        heading: 'Overseas retirement',
        parts: [
          {
            type: 'text',
            value:
              'If retiring abroad, check how your country of residence taxes foreign pension and IRA withdrawals. US-sourced retirement income is often covered under tax treaties but interpretation varies. A cross-border CPA is recommended before drawing heavily from this account.',
          },
        ],
      },
    ],
    stats: [
      { label: `Projected balance at ${p.retirementAge}`, value: fmt(p.balanceAtRetirement) },
      { label: 'Estimated annual draw', value: fmtAnnual(p.annualDraw) },
      {
        label: 'Tax treatment',
        value: 'Ordinary income',
        valueTermId: 'ordinaryIncome',
      },
      { label: 'Required minimum distributions begin', value: `Age ${RMD_AGE}` },
    ],
    sources: PRETAX_ACCORDION_SOURCES,
  }
}

function buildRothContent(p: IncomeAccountAccordionParams): IncomeAccordionContent {
  return {
    title: '',
    introParagraphs: [],
    sections: [
      {
        heading: 'Tax treatment',
        parts: [
          {
            type: 'text',
            value: 'Qualified Roth withdrawals are federal tax-free with no impact on Medicare ',
          },
          { type: 'term', id: 'irmaa' },
          {
            type: 'text',
            value: ' thresholds or Social Security provisional income calculations.',
          },
        ],
      },
      {
        heading: 'Medicare impact',
        parts: [
          {
            type: 'text',
            value: 'Roth withdrawals do NOT count toward ',
          },
          { type: 'term', id: 'magi' },
          {
            type: 'text',
            value: '. Drawing from Roth in a given year instead of pre-tax can keep you below the ',
          },
          { type: 'term', id: 'irmaa' },
          {
            type: 'text',
            value: ' surcharge threshold and reduce your Medicare premium costs.',
          },
        ],
      },
      {
        heading: 'Overseas retirement',
        parts: [
          {
            type: 'text',
            value:
              'Roth withdrawals are generally tax-free under most US tax treaties and are typically the cleanest account to draw from for large one-time expenses abroad such as relocation or property purchases. Confirm treatment with a local tax advisor in your country of residence.',
          },
        ],
      },
      {
        heading: 'Roth conversions',
        parts: [
          {
            type: 'text',
            value: 'A ',
          },
          { type: 'term', id: 'rothConversion' },
          {
            type: 'text',
            value:
              ' moves money from your pre-tax 401k or traditional IRA into your Roth IRA. You pay ordinary income tax on the converted amount now in exchange for tax-free growth and withdrawals later with no required distributions ever.',
          },
        ],
      },
      {
        heading: '',
        parts: [
          {
            type: 'text',
            value: 'The window between retirement and age ',
          },
          { type: 'amount', value: String(RMD_AGE) },
          {
            type: 'text',
            value: ' when ',
          },
          { type: 'term', id: 'rmds' },
          {
            type: 'text',
            value:
              ' begin is the ideal conversion period. In years where your income is lower than usual you can convert up to your remaining bracket room without increasing your effective tax rate.',
          },
        ],
      },
      {
        heading: '',
        parts: [
          {
            type: 'text',
            value: 'Converting gradually over several years spreads the tax hit and reduces the balance that will eventually generate mandatory ',
          },
          { type: 'term', id: 'rmds' },
          {
            type: 'text',
            value:
              '. Even modest annual conversions of $10,000 to $20,000 can meaningfully reduce future RMD exposure.',
          },
        ],
      },
    ],
    stats: [
      { label: `Projected balance at ${p.retirementAge}`, value: fmt(p.balanceAtRetirement) },
      { label: 'Estimated annual draw', value: fmtAnnual(p.annualDraw) },
      { label: 'Tax treatment', value: 'Tax-free' },
      { label: 'RMDs', value: 'None' },
    ],
    sources: ROTH_ACCORDION_SOURCES,
  }
}

function buildHsaContent(p: IncomeAccountAccordionParams): IncomeAccordionContent {
  const medicalAnnual = Math.min(p.medicalAnnualDraw ?? p.annualDraw, p.balanceAtRetirement)
  const preserved = Math.max(0, p.balanceAtRetirement - medicalAnnual)

  return {
    title: '',
    introParagraphs: [],
    sections: [
      {
        heading: 'Qualified medical expenses',
        parts: [
          {
            type: 'text',
            value:
              'HSA funds cover a broad range of expenses including doctor visits, prescriptions, dental, vision, and long-term care premiums. After 65, Medicare Part B, Part D, and Medicare Advantage premiums are also qualified expenses. Note: HSA funds cannot be used for Medigap supplemental premiums.',
          },
        ],
      },
      {
        heading: 'After age 65',
        parts: [
          {
            type: 'text',
            value: 'Non-medical withdrawals lose the 20% penalty but become taxable as ',
          },
          { type: 'term', id: 'ordinaryIncome' },
          {
            type: 'text',
            value:
              ', similar to a traditional IRA. Always exhaust qualified medical use before treating this as general income.',
          },
        ],
      },
      {
        heading: 'Overseas retirement',
        parts: [
          {
            type: 'text',
            value:
              'HSA funds can cover out-of-pocket medical costs internationally. Qualified medical expense rules still apply regardless of country of residence. Keep receipts and documentation for any medical withdrawal made abroad.',
          },
        ],
      },
      {
        heading: 'Using HSA funds after 65',
        parts: [
          {
            type: 'text',
            value:
              'Once you turn 65 your HSA becomes significantly more flexible. Qualified medical withdrawals remain completely tax-free as always. But non-medical withdrawals, which previously carried a 20 percent penalty on top of income tax, now carry only ',
          },
          { type: 'term', id: 'ordinaryIncome' },
          {
            type: 'text',
            value: ' with no penalty at all.',
          },
        ],
      },
      {
        heading: '',
        parts: [
          {
            type: 'text',
            value:
              'This makes your HSA function like a traditional IRA for non-medical expenses after 65. The key difference is that medical withdrawals stay tax-free indefinitely, which a traditional IRA cannot offer.',
          },
        ],
      },
      {
        heading: '',
        parts: [
          {
            type: 'text',
            value:
              'After 65 your HSA can pay Medicare Part B, Part D, and Medicare Advantage premiums tax-free. This is one of the only accounts that can cover Medicare premiums with pre-tax dollars. It cannot be used for Medigap supplemental premiums.',
          },
        ],
      },
      {
        heading: '',
        parts: [
          {
            type: 'text',
            value:
              'If you retire abroad, HSA funds can still cover qualified out-of-pocket medical costs internationally. Keep receipts for all medical withdrawals regardless of country since IRS qualified expense rules apply everywhere.',
          },
        ],
      },
      {
        heading: '',
        parts: [
          {
            type: 'text',
            value: 'One planning note: HSA funds have no ',
          },
          { type: 'term', id: 'rmds' },
          {
            type: 'text',
            value:
              ' and no expiration. Any balance left at death passes to your spouse tax-free as an HSA. Non-spouse beneficiaries receive the balance as taxable income in the year of death.',
          },
        ],
      },
    ],
    stats: [
      { label: `Projected balance at ${p.retirementAge}`, value: fmt(p.balanceAtRetirement) },
      { label: 'Estimated medical draw', value: fmtAnnual(medicalAnnual) },
      { label: 'Remaining preserved', value: fmt(Math.round(preserved)) },
      {
        label: 'Tax treatment',
        value: 'Tax-free (medical) / Ordinary income (non-medical after 65)',
      },
    ],
    sources: HSA_ACCORDION_SOURCES,
  }
}

export function buildIncomeAccountAccordionContent(
  p: IncomeAccountAccordionParams,
): IncomeAccordionContent | null {
  if (p.locale !== 'us') return null

  let content: IncomeAccordionContent | null = null
  switch (p.bucket) {
    case 'brokerage':
      content = buildBrokerageContent(p)
      break
    case 'pretax':
      content = buildPretaxContent(p)
      break
    case 'roth':
      content = buildRothContent(p)
      break
    case 'hsa':
      content = buildHsaContent(p)
      break
  }
  return content
}

export function buildIncomeAccountAccordionParams(args: {
  bucket: AccountScenarioBucketId
  retirementAge: number
  balanceAtRetirement: number
  annualDraw: number
  locale: OnboardingRegionId
  inputs: CalculatorInputs | undefined
  tradWdAnn: number
  medicalAnnualDraw?: number
  taxDetail: TaxDetailedResult
  filingStatus?: FilingStatusId
}): IncomeAccountAccordionParams {
  return {
    bucket: args.bucket,
    retirementAge: args.retirementAge,
    balanceAtRetirement: args.balanceAtRetirement,
    annualDraw: args.annualDraw,
    locale: args.locale,
    filingStatus: normalizeCalculatorFilingStatus(args.filingStatus ?? args.inputs?.filingStatus),
    tradWdAnn: args.tradWdAnn,
    medicalAnnualDraw: args.medicalAnnualDraw,
    taxDetail: args.taxDetail,
  }
}
