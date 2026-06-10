import type { CalculatorInputs, CalculatorUi, ComputeBalanceModes } from './computeResults'
import { computeResults as runComputeResults } from './computeResults'
import { benefitAtClaimAgeFromMonthlyAt67, isSsConfigured, resolveUserEstimates } from './socialSecurity'

export type RetirementAgeSensitivityColumn = {
  age: number
  isSetAge: boolean
  portfolio: number
  portfolioDelta: number
  monthlyIncome: number
  incomeDelta: number
  goalStatus: 'both' | 'portfolio' | 'income' | 'none'
  ssMonthly: number | null
  yearlyIncomeGain: number | null
}

export type RetirementAgeSensitivityTable = {
  setRetirementAge: number
  portfolioGoal: number
  incomeGoal: number
  ssConfigured: boolean
  columns: RetirementAgeSensitivityColumn[]
}

function clampSensitivityAge(age: number): number {
  return Math.max(50, Math.round(age))
}

/** Five ages: set −2, −1, set, +1, +2 (each floored at 50). Set is column index 2. */
export function sensitivityAgesForSetAge(setAge: number): number[] {
  const set = Math.round(setAge)
  return [
    clampSensitivityAge(set - 2),
    clampSensitivityAge(set - 1),
    clampSensitivityAge(set),
    clampSensitivityAge(set + 1),
    clampSensitivityAge(set + 2),
  ]
}

export const SET_AGE_COLUMN_INDEX = 2

function monthlySsAtRetirementAge(inputs: CalculatorInputs, age: number): number | null {
  if (!isSsConfigured(inputs)) return null
  if (age < 62) return null
  const monthlyAt67 =
    inputs.ssBenefit67 > 0 ? inputs.ssBenefit67 : resolveUserEstimates(inputs).b67
  if (monthlyAt67 <= 0) return null
  return benefitAtClaimAgeFromMonthlyAt67(monthlyAt67, age)
}

function goalStatusFor(
  portfolio: number,
  monthlyIncome: number,
  portfolioGoal: number,
  incomeGoal: number,
): RetirementAgeSensitivityColumn['goalStatus'] {
  const portfolioMet = portfolioGoal > 0 && portfolio >= portfolioGoal
  const incomeMet = incomeGoal > 0 && monthlyIncome >= incomeGoal
  if (portfolioMet && incomeMet) return 'both'
  if (portfolioMet) return 'portfolio'
  if (incomeMet) return 'income'
  return 'none'
}

function projectAtAge(
  inputs: CalculatorInputs,
  ui: CalculatorUi,
  balanceModes: ComputeBalanceModes,
  age: number,
): Pick<ComputedAtAge, 'portfolio' | 'monthlyIncome' | 'ssMonthly'> {
  const result = runComputeResults({ ...inputs, targetRetirementAge: age }, ui, balanceModes)
  const portfolio = result.totalFV
  const ssMonthly = monthlySsAtRetirementAge(inputs, age)
  const portfolioWithdrawal = (portfolio * inputs.wdRate) / 12
  const monthlyIncome = portfolioWithdrawal + (ssMonthly ?? 0)
  return { portfolio, monthlyIncome, ssMonthly }
}

type ComputedAtAge = {
  portfolio: number
  monthlyIncome: number
  ssMonthly: number | null
}

export function computeRetirementAgeSensitivityTable(
  inputs: CalculatorInputs,
  ui: CalculatorUi,
  balanceModes: ComputeBalanceModes,
): RetirementAgeSensitivityTable {
  const setRetirementAge = Math.round(inputs.targetRetirementAge)
  const portfolioGoal = Math.max(0, inputs.growthGoal)
  const incomeGoal = Math.max(0, inputs.monthlyIncomeGoal)
  const ssConfigured = isSsConfigured(inputs)
  const ages = sensitivityAgesForSetAge(setRetirementAge)

  const computed: ComputedAtAge[] = ages.map((age) => projectAtAge(inputs, ui, balanceModes, age))

  const columns: RetirementAgeSensitivityColumn[] = computed.map((row, index) => {
    const age = ages[index]!
    const prev = index > 0 ? computed[index - 1]! : null
    const prevAge = index > 0 ? ages[index - 1]! : null

    let yearlyIncomeGain: number | null = null
    if (prev && prevAge != null && age > prevAge) {
      yearlyIncomeGain = Math.round((row.monthlyIncome - prev.monthlyIncome) / (age - prevAge))
    }

    return {
      age,
      isSetAge: index === SET_AGE_COLUMN_INDEX,
      portfolio: row.portfolio,
      portfolioDelta: row.portfolio - portfolioGoal,
      monthlyIncome: row.monthlyIncome,
      incomeDelta: row.monthlyIncome - incomeGoal,
      goalStatus: goalStatusFor(row.portfolio, row.monthlyIncome, portfolioGoal, incomeGoal),
      ssMonthly: row.ssMonthly,
      yearlyIncomeGain,
    }
  })

  return {
    setRetirementAge,
    portfolioGoal,
    incomeGoal,
    ssConfigured,
    columns,
  }
}

export function firstAgeHittingBothGoals(
  columns: RetirementAgeSensitivityColumn[],
): number | null {
  for (const col of columns) {
    if (col.goalStatus === 'both') return col.age
  }
  return null
}

export function earliestBothGoalsAgeBefore(
  columns: RetirementAgeSensitivityColumn[],
  beforeAge: number,
): number | null {
  let earliest: number | null = null
  for (const col of columns) {
    if (col.goalStatus !== 'both') continue
    if (col.age >= beforeAge) continue
    if (earliest == null || col.age < earliest) earliest = col.age
  }
  return earliest
}

export function averageYearlyIncomeGainBetweenAges(
  columns: RetirementAgeSensitivityColumn[],
  fromColumnIndex: number,
  toColumnIndex: number,
): number | null {
  if (fromColumnIndex < 0 || toColumnIndex < 0 || toColumnIndex <= fromColumnIndex) return null
  const gains: number[] = []
  for (let i = fromColumnIndex + 1; i <= toColumnIndex; i++) {
    const gain = columns[i]?.yearlyIncomeGain
    if (gain != null && Number.isFinite(gain)) gains.push(gain)
  }
  if (gains.length === 0) return null
  return Math.round(gains.reduce((sum, g) => sum + g, 0) / gains.length)
}
