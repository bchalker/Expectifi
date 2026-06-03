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
import type { AccountIncomeStrategy } from './accountIncomeStrategy'

export type IncomeAccordionPart =
  | { type: 'text'; value: string }
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
  strategy?: AccountIncomeStrategy
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
    title: 'Why withdraw here first?',
    introParagraphs: [
      [
        {
          type: 'text',
          value:
            'Withdrawing from your taxable brokerage first preserves tax-advantaged compounding in your other accounts.',
        },
      ],
      [
        {
          type: 'text',
          value:
            'The longer your Roth and pre-tax accounts sit untouched, the more they grow.',
        },
      ],
    ],
    sections: [
      {
        heading: 'Tax treatment',
        parts: [
          {
            type: 'text',
            value:
              'Capital gains on holdings held over one year are taxed at 0%, 15%, or 20% depending on your total income that year. At your current withdrawal rate of ',
          },
          { type: 'text', value: fmtAnnual(p.annualDraw) },
          {
            type: 'text',
            value: ' your blended rate falls in the ',
          },
          { type: 'text', value: ltcgBracket },
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
  }
}

function buildPretaxContent(p: IncomeAccountAccordionParams): IncomeAccordionContent {
  const bracketRoom = rothConversionRoom(p.tradWdAnn, p.filingStatus)

  return {
    title: 'Why is this recommended second?',
    introParagraphs: [
      [
        {
          type: 'text',
          value:
            'Your brokerage draws down taxable assets first while your pre-tax accounts keep compounding. Drawing here second balances tax exposure without triggering RMDs prematurely.',
        },
      ],
    ],
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
          { type: 'text', value: fmtAnnual(p.annualDraw) },
          {
            type: 'text',
            value: ' you have approximately ',
          },
          { type: 'text', value: fmt(Math.round(bracketRoom)) },
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
          {
            type: 'text',
            value: ` begin at age ${RMD_AGE}. Use the window between retirement and ${RMD_AGE} to convert strategically and reduce the RMD burden later.`,
          },
        ],
      },
      {
        heading: 'Early withdrawal',
        parts: [
          {
            type: 'text',
            value: `At ${p.retirementAge} you are past the 59½ penalty threshold. No early withdrawal penalty applies.`,
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
      { label: 'RMDs begin', value: `Age ${RMD_AGE}` },
    ],
  }
}

function buildRothContent(p: IncomeAccountAccordionParams): IncomeAccordionContent {
  return {
    title: 'Why save this for last?',
    introParagraphs: [
      [
        { type: 'text', value: 'Roth withdrawals are completely tax-free and there are no ' },
        { type: 'term', id: 'rmds' },
        {
          type: 'text',
          value:
            ' ever. Every dollar compounds indefinitely until you need it. The longer you leave it untouched the more powerful it becomes. Reserve this account for large one-time expenses or years where other income pushes you into a higher bracket.',
        },
      ],
    ],
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
        heading: 'RMDs',
        parts: [
          { type: 'text', value: 'None. Ever. This account has no required distribution schedule.' },
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
    ],
    stats: [
      { label: `Projected balance at ${p.retirementAge}`, value: fmt(p.balanceAtRetirement) },
      { label: 'Estimated annual draw', value: fmtAnnual(p.annualDraw) },
      { label: 'Tax treatment', value: 'Tax-free' },
      { label: 'RMDs', value: 'None' },
    ],
  }
}

function buildHsaContent(p: IncomeAccountAccordionParams): IncomeAccordionContent {
  const medicalAnnual = Math.min(p.medicalAnnualDraw ?? p.annualDraw, p.balanceAtRetirement)
  const preserved = Math.max(0, p.balanceAtRetirement - medicalAnnual)

  return {
    title: 'Why use this for medical expenses first?',
    introParagraphs: [
      [
        {
          type: 'text',
          value:
            'The HSA is the only account where contributions, growth, and withdrawals are all tax-free when used for ',
        },
        { type: 'term', id: 'qualifiedMedical' },
        {
          type: 'text',
          value:
            '. Using it first for medical costs preserves your taxable and Roth funds for income and lifestyle spending.',
        },
      ],
    ],
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
  }
}

function buildDividendStrategyOverlay(
  bucket: AccountScenarioBucketId,
  content: IncomeAccordionContent,
): IncomeAccordionContent {
  const introByBucket: Partial<Record<AccountScenarioBucketId, IncomeAccordionPart[][]>> = {
    brokerage: [
      [
        {
          type: 'text',
          value:
            'Dividend income from a taxable brokerage keeps principal invested while distributions cover spending. You still owe tax on distributions, but you avoid selling shares and triggering capital gains until you choose to.',
        },
      ],
    ],
    roth: [
      [
        {
          type: 'text',
          value:
            'Tax-free Roth growth pairs well with dividend funds when you want income without selling shares. Qualified Roth withdrawals stay tax-free; dividend distributions inside the account compound without RMD pressure.',
        },
      ],
    ],
    pretax: [
      [
        {
          type: 'text',
          value:
            'Modeling dividend income from a pre-tax account is conservative; real-world dividends in an IRA are typically reinvested. Use this when you plan to take taxable distributions from the account for spending.',
        },
      ],
    ],
  }

  const titleByBucket: Partial<Record<AccountScenarioBucketId, string>> = {
    brokerage: 'Why dividend income here?',
    roth: 'Why dividend income from Roth?',
    pretax: 'Why model dividend distributions?',
    hsa: 'Why preserve HSA for dividends?',
  }

  return {
    ...content,
    title: titleByBucket[bucket] ?? content.title,
    introParagraphs: introByBucket[bucket] ?? content.introParagraphs,
  }
}

function buildBothStrategyOverlay(
  bucket: AccountScenarioBucketId,
  content: IncomeAccordionContent,
): IncomeAccordionContent {
  const hybridIntro: IncomeAccordionPart[][] = [
    [
      {
        type: 'text',
        value:
          'A hybrid strategy uses dividend distributions as baseline cash flow and supplements with principal withdrawals. This can raise monthly income without selling entirely into a single approach, but it increases runway risk: both NAV erosion on high-yield funds and rising withdrawal draws can shrink principal faster than either strategy alone.',
      },
    ],
    [
      {
        type: 'text',
        value:
          'When both are active, monitor estimated principal runway closely. Dividend yield may not fully cover spending, so the withdrawal portion still erodes balance, and funds flagged for NAV erosion compound that effect year over year.',
      },
    ],
  ]

  const titleByBucket: Partial<Record<AccountScenarioBucketId, string>> = {
    brokerage: 'Why combine dividend and withdrawal?',
    pretax: 'Why combine dividend and withdrawal?',
    roth: 'Why combine dividend and withdrawal?',
    hsa: 'Why combine strategies on HSA?',
  }

  return {
    ...content,
    title: titleByBucket[bucket] ?? 'Why combine dividend and withdrawal?',
    introParagraphs: hybridIntro,
    sections: [
      ...content.sections,
      {
        heading: 'Hybrid runway risk',
        parts: [
          {
            type: 'text',
            value:
              'Total income is dividend yield plus a withdrawal rate adjusted for inflation. Principal runway shrinks when distributions plus draws exceed portfolio growth. High-yield funds with NAV erosion reduce balance even when you do not sell shares.',
          },
        ],
      },
    ],
  }
}

function buildWithdrawStrategyOverlay(
  bucket: AccountScenarioBucketId,
  content: IncomeAccordionContent,
): IncomeAccordionContent {
  if (bucket === 'roth') {
    return {
      ...content,
      title: 'Why withdraw from Roth now?',
      introParagraphs: [
        [
          {
            type: 'text',
            value:
              'Drawing from Roth trades long-term tax-free compounding for immediate tax-free income. This can make sense when other accounts would trigger higher taxes or when you need flexible cash without MAGI impact.',
          },
        ],
      ],
    }
  }
  if (bucket === 'brokerage') {
    return content
  }
  return content
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
  if (!content) return null

  const strategy = p.strategy ?? 'withdraw'
  if (strategy === 'dividend') return buildDividendStrategyOverlay(p.bucket, content)
  if (strategy === 'both') return buildBothStrategyOverlay(p.bucket, content)
  return buildWithdrawStrategyOverlay(p.bucket, content)
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
  strategy?: AccountIncomeStrategy
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
    strategy: args.strategy,
  }
}
