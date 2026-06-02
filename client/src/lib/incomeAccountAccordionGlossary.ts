/** Tooltip copy for income account accordion glossary terms. */
export const INCOME_ACCORDION_GLOSSARY = {
  magi: 'Modified Adjusted Gross Income. The IRS uses this number to determine your tax bracket, Medicare premiums, and eligibility for certain deductions. Some income sources like Roth withdrawals do not count toward MAGI.',
  irmaa:
    'Income-Related Monthly Adjustment Amount. A Medicare surcharge added to your Part B and Part D premiums when your MAGI exceeds certain thresholds. In 2024 the surcharge kicks in above $103,000 for single filers.',
  rmds:
    'Required Minimum Distributions. The IRS requires you to withdraw a minimum amount from pre-tax retirement accounts each year starting at age 73. The amount is calculated based on your account balance and life expectancy. Failing to take RMDs results in a 25 percent excise tax on the amount not withdrawn.',
  rothConversion:
    'Moving money from a pre-tax account like a 401k or traditional IRA into a Roth IRA. You pay income tax on the converted amount now in exchange for tax-free growth and withdrawals later. Most effective in low-income years before RMDs or Social Security begin.',
  qualifiedMedical:
    'Medical costs the IRS approves for tax-free HSA withdrawal. Includes doctor visits, prescriptions, dental, vision, hearing aids, and long-term care premiums. Does not include cosmetic procedures or most over-the-counter items without a prescription.',
  longTermCapitalGains:
    'Profit from selling an asset held longer than one year. Taxed at preferential rates of 0%, 15%, or 20% depending on your total income, which is lower than ordinary income tax rates.',
  ordinaryIncome:
    'Income taxed at your standard federal tax rate, the same as wages or salary. Pre-tax retirement withdrawals, traditional IRA distributions, and non-medical HSA withdrawals after 65 all count as ordinary income.',
  magiThreshold:
    'The income level above which Medicare adds a monthly surcharge to your premiums. Keeping your withdrawals below this line can save hundreds per month in Medicare costs.',
} as const

export type IncomeAccordionGlossaryTermId = keyof typeof INCOME_ACCORDION_GLOSSARY
