/** External reference links shown at the bottom of income accordion education. */
export type IncomeAccordionSourceLink = {
  label: string
  href: string
}

export const BROKERAGE_ACCORDION_SOURCES: IncomeAccordionSourceLink[] = [
  {
    label: 'IRS Topic 409 — Capital Gains',
    href: 'https://www.irs.gov/taxtopics/tc409',
  },
  {
    label: 'IRS Schedule D',
    href: 'https://www.irs.gov/forms-pubs/about-schedule-d-form-1040',
  },
]

export const PRETAX_ACCORDION_SOURCES: IncomeAccordionSourceLink[] = [
  {
    label: 'IRS Topic 558 — Early Distributions',
    href: 'https://www.irs.gov/taxtopics/tc558',
  },
  {
    label: 'IRS RMD Rules',
    href: 'https://www.irs.gov/retirement-plans/retirement-plans-faqs-regarding-required-minimum-distributions',
  },
  {
    label: 'IRS Publication 590-B',
    href: 'https://www.irs.gov/publications/p590b',
  },
]

export const ROTH_ACCORDION_SOURCES: IncomeAccordionSourceLink[] = [
  {
    label: 'IRS Topic 309 — Roth IRA',
    href: 'https://www.irs.gov/taxtopics/tc309',
  },
  {
    label: 'IRS Publication 590-B',
    href: 'https://www.irs.gov/publications/p590b',
  },
  {
    label: 'Investopedia — Roth Conversion',
    href: 'https://www.investopedia.com/terms/r/rothconversion.asp',
  },
]

export const HSA_ACCORDION_SOURCES: IncomeAccordionSourceLink[] = [
  {
    label: 'IRS Publication 969 — HSAs',
    href: 'https://www.irs.gov/publications/p969',
  },
  {
    label: 'IRS Topic 502 — Medical Expenses',
    href: 'https://www.irs.gov/taxtopics/tc502',
  },
  {
    label: 'IRS Publication 554 — Tax Guide for Seniors',
    href: 'https://www.irs.gov/publications/p554',
  },
]

export const PORTFOLIO_GUIDANCE_HSA_SOURCES: IncomeAccordionSourceLink[] = [
  {
    label: 'IRS Publication 969',
    href: 'https://www.irs.gov/publications/p969',
  },
  {
    label: 'IRS Publication 554 — Tax Guide for Seniors',
    href: 'https://www.irs.gov/publications/p554',
  },
  {
    label: 'Medicare.gov Part B Costs',
    href: 'https://www.medicare.gov/your-medicare-costs/part-b-costs',
  },
]
