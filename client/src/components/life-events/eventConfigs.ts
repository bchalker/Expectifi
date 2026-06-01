import type { LifeEventConfig } from './types'
import { formatCurrency, formatStripPortfolioValue } from './utils'

export const growthEventConfigs: LifeEventConfig[] = [
  {
    id: 'buy-car-cash',
    canonicalLabel: 'Buy a car (cash)',
    displayLabel: 'buy a car with cash',
    type: 'lump-sum-out',
    phase: 'growth',
    isRecurring: false,
    color: '#EF9F27',
    defaultAmount: 35000,
    defaultYear: (currentYear, retirementYear) =>
      Math.min(currentYear + 1, retirementYear - 1),
    amountMin: 5000,
    amountMax: 100000,
    amountStep: 1000,
    amountLabel: 'Purchase price',
    yearLabel: 'When to purchase?',
    headerTitlePrefix: 'Buy a ',
    headerTitleSuffix: ' car with cash',
    formatAmount: (amount) => '$' + amount.toLocaleString(),
    formatHeaderAmount: formatStripPortfolioValue,
    narrativeTemplate: (amount, year, futureValue, retirementYear) =>
      `A ${formatCurrency(amount)} car purchase in ${year} ` +
      `costs your retirement portfolio ${formatCurrency(futureValue)}. ` +
      `That is what it would have grown to by ${retirementYear}.`,
  },
  {
    id: 'pay-off-mortgage',
    canonicalLabel: 'Pay off mortgage early',
    displayLabel: 'pay off my mortgage early',
    type: 'lump-sum-out',
    phase: 'growth',
    isRecurring: false,
    color: '#E24B4A',
    defaultAmount: 85000,
    defaultYear: (currentYear) => currentYear + 2,
    amountMin: 10000,
    amountMax: 600000,
    amountStep: 5000,
    amountLabel: 'Remaining balance',
    yearLabel: 'When to pay off?',
    headerTitlePrefix: 'Pay ',
    headerTitleSuffix: ' off my mortgage early',
    formatAmount: (amount) => '$' + amount.toLocaleString(),
    formatHeaderAmount: formatStripPortfolioValue,
    narrativeTemplate: (amount, year, futureValue, retirementYear) =>
      `Paying off ${formatCurrency(amount)} in ${year} ` +
      `removes ${formatCurrency(futureValue)} from your ` +
      `retirement portfolio by ${retirementYear}. ` +
      `That is what it would have compounded to.`,
    extras: {
      showTradeoffAnalysis: true,
      mortgageRateDefault: 0.04,
      monthlyPaymentDefault: 1500,
      mortgageRateMin: 0.5,
      mortgageRateMax: 10,
      mortgageRateStep: 0.05,
      tradeoffNarrative: (
        _amount,
        _year,
        _futureValue,
        _retirementYear,
        mortgageRate,
        portfolioGrowthRate,
        _monthlyPayment,
        _yearsRemaining,
        netAdvantage,
        investingWins,
      ) =>
        investingWins
          ? `At your ${(mortgageRate * 100).toFixed(2)}% ` +
            `mortgage rate and ` +
            `${(portfolioGrowthRate * 100).toFixed(1)}% ` +
            `portfolio growth rate, staying invested likely ` +
            `outperforms paying off early by roughly ` +
            `${formatCurrency(netAdvantage)}. ` +
            `Carrying a mortgage into retirement is a personal ` +
            `decision. Here is what each path looks like.`
          : `At your ${(mortgageRate * 100).toFixed(2)}% ` +
            `mortgage rate and ` +
            `${(portfolioGrowthRate * 100).toFixed(1)}% ` +
            `portfolio growth rate, paying off early likely ` +
            `outperforms staying invested by roughly ` +
            `${formatCurrency(Math.abs(netAdvantage))}. ` +
            `Here is what each path looks like.`,
    },
  },
  {
    id: 'home-renovation',
    canonicalLabel: 'Home renovation / major repair',
    displayLabel: 'renovate my home',
    type: 'lump-sum-out',
    phase: 'growth',
    isRecurring: false,
    color: '#534AB7',
    defaultAmount: 45000,
    defaultYear: (currentYear) => currentYear + 1,
    amountMin: 5000,
    amountMax: 300000,
    amountStep: 2500,
    amountLabel: 'Renovation budget',
    yearLabel: 'When to renovate?',
    headerTitlePrefix: 'Spend ',
    headerTitleSuffix: ' to renovate my home',
    formatAmount: (amount) => '$' + amount.toLocaleString(),
    formatHeaderAmount: formatStripPortfolioValue,
    narrativeTemplate: (amount, year, futureValue, retirementYear) =>
      `A ${formatCurrency(amount)} renovation in ${year} ` +
      `costs your retirement portfolio ` +
      `${formatCurrency(futureValue)}. ` +
      `That is what it would have grown to by ` +
      `${retirementYear}.`,
  },
  {
    id: 'medical-expense',
    canonicalLabel: 'Medical procedure / major health expense',
    displayLabel: 'cover a major medical expense',
    type: 'lump-sum-out',
    phase: 'growth',
    isRecurring: false,
    color: '#D85A30',
    defaultAmount: 25000,
    defaultYear: (currentYear) => currentYear + 1,
    amountMin: 1000,
    amountMax: 500000,
    amountStep: 1000,
    amountLabel: 'Estimated expense',
    yearLabel: 'When to plan for?',
    headerTitlePrefix: 'Cover a ',
    headerTitleSuffix: ' medical expense',
    formatAmount: (amount) => '$' + amount.toLocaleString(),
    formatHeaderAmount: formatStripPortfolioValue,
    narrativeTemplate: (amount, year, futureValue, retirementYear) =>
      `A ${formatCurrency(amount)} medical expense ` +
      `in ${year} costs your retirement portfolio ` +
      `${formatCurrency(futureValue)}. ` +
      `That is what the out-of-pocket amount would ` +
      `have compounded to by ${retirementYear}.`,
    extras: {
      showHsaAnalysis: true,
      hsaOffsetNarrative: (
        grossExpense,
        hsaBalance,
        hsaOffset,
        netExpense,
        _futureValue,
        _retirementYear,
        hasHsa,
        fullyCovered,
        hsaSavings,
      ) => {
        if (fullyCovered) {
          return (
            `Your HSA balance of ${formatCurrency(hsaBalance)} fully covers ` +
            `this expense. No retirement portfolio impact. Your HSA is doing exactly what ` +
            `it was designed for.`
          )
        }
        if (hasHsa && hsaOffset > 0) {
          return (
            `Your HSA covers ${formatCurrency(hsaOffset)} of this expense. ` +
            `Only ${formatCurrency(netExpense)} comes from your retirement portfolio, saving you ` +
            `${formatCurrency(hsaSavings)} in lost compounding compared to paying ` +
            `the full amount from retirement savings.`
          )
        }
        return (
          `You do not currently have an HSA balance. ` +
          `The full ${formatCurrency(grossExpense)} comes from your retirement portfolio. ` +
          `An HSA is one of the most tax-efficient ways to prepare for medical costs in retirement. ` +
          `Contributions go in pre-tax, grow tax-free, and withdraw tax-free for qualified medical expenses.`
        )
      },
    },
  },
  {
    id: 'tuition-support',
    canonicalLabel: 'Grandkid / child tuition support',
    displayLabel: 'give tuition support',
    type: 'recurring-out',
    phase: 'growth',
    isRecurring: true,
    color: '#534AB7',
    defaultAmount: 600,
    defaultDuration: 4,
    durationMin: 1,
    durationMax: 8,
    durationStep: 1,
    durationLabel: 'How many years?',
    defaultYear: (currentYear) => currentYear + 2,
    amountMin: 100,
    amountMax: 5000,
    amountStep: 50,
    amountLabel: 'Monthly support',
    yearLabel: 'When to start?',
    headerTitlePrefix: 'Give ',
    headerTitleSuffix: ' for tuition support',
    formatAmount: (amount) => '$' + amount.toLocaleString() + '/mo',
    formatHeaderAmount: (amount) => '$' + amount.toLocaleString(),
    narrativeTemplate: (amount, year, futureValue, retirementYear, duration) => {
      const years = duration ?? 4
      const total = amount * 12 * years
      const endYear = year + years
      return (
        `Supporting ${formatCurrency(amount)}/mo ` +
        `from ${year} to ${endYear} ` +
        `(${formatCurrency(total)} total) costs ` +
        `your retirement portfolio ` +
        `${formatCurrency(futureValue)}. ` +
        `That is what those contributions would ` +
        `have compounded to by ${retirementYear}.`
      )
    },
  },
  {
    id: 'charitable-giving',
    canonicalLabel: 'Charitable giving / tithe',
    displayLabel: 'give regularly to charity',
    type: 'recurring-out',
    phase: 'growth',
    isRecurring: true,
    color: '#0F6E56',
    defaultAmount: 400,
    defaultDuration: 20,
    durationMin: 1,
    durationMax: 30,
    durationStep: 1,
    durationLabel: 'For how many years?',
    defaultYear: (currentYear) => currentYear,
    amountMin: 50,
    amountMax: 5000,
    amountStep: 50,
    amountLabel: 'Monthly giving',
    yearLabel: 'Starting when?',
    headerTitlePrefix: 'Give ',
    headerTitleSuffix: ' to charity',
    formatAmount: (amount) => '$' + amount.toLocaleString() + '/mo',
    formatHeaderAmount: (amount) => '$' + amount.toLocaleString(),
    narrativeTemplate: (amount, year, futureValue, retirementYear, duration) => {
      const years = duration ?? 20
      const total = amount * 12 * years
      const endYear = year + years
      return (
        `Giving ${formatCurrency(amount)}/mo ` +
        `from ${year} to ${endYear} ` +
        `(${formatCurrency(total)} total) costs ` +
        `your retirement portfolio ` +
        `${formatCurrency(futureValue)}. ` +
        `That is what those contributions would ` +
        `have compounded to by ${retirementYear}.`
      )
    },
  },
  {
    id: 'church-tithe',
    canonicalLabel: 'Church tithe',
    displayLabel: 'tithe to my church',
    type: 'recurring-out',
    phase: 'growth',
    isRecurring: true,
    color: '#185FA5',
    defaultAmount: 500,
    defaultDuration: 25,
    durationMin: 1,
    durationMax: 40,
    durationStep: 1,
    durationLabel: 'For how many years?',
    defaultYear: (currentYear) => currentYear,
    amountMin: 50,
    amountMax: 10000,
    amountStep: 50,
    amountLabel: 'Monthly tithe',
    yearLabel: 'Starting when?',
    headerTitlePrefix: 'Tithe ',
    headerTitleSuffix: ' to my church',
    formatAmount: (amount) => '$' + amount.toLocaleString() + '/mo',
    formatHeaderAmount: (amount) => '$' + amount.toLocaleString(),
    narrativeTemplate: (amount, year, futureValue, retirementYear, duration) => {
      const years = duration ?? 25
      const total = amount * 12 * years
      const endYear = year + years
      return (
        `Tithing ${formatCurrency(amount)}/mo ` +
        `from ${year} to ${endYear} ` +
        `(${formatCurrency(total)} total) costs ` +
        `your retirement portfolio ` +
        `${formatCurrency(futureValue)}. ` +
        `That is what those contributions would ` +
        `have compounded to by ${retirementYear}.`
      )
    },
  },
]

export const incomeEventConfigs: LifeEventConfig[] = []
