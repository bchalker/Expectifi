import { createContext, useContext, type ReactNode } from 'react'
import type { AccountScenarioBucketId } from '../lib/accountReturnScenario'
import type { CalculatorInputs } from '../lib/computeResults'
import type { ImportedPositionRow } from '../lib/positionsCsv'

export type AccountScenarioPopoutData = {
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  importedPositionRows: ImportedPositionRow[]
  yearsToRetirement: number
  retirementCalendarYear: number
  retRate: number
  brkRate: number
  accountNameForBucket: (bucket: AccountScenarioBucketId) => string
}

const AccountScenarioPopoutDataContext = createContext<AccountScenarioPopoutData | null>(null)

export function AccountScenarioPopoutDataProvider({
  value,
  children,
}: {
  value: AccountScenarioPopoutData | null
  children: ReactNode
}) {
  return (
    <AccountScenarioPopoutDataContext.Provider value={value}>
      {children}
    </AccountScenarioPopoutDataContext.Provider>
  )
}

export function useAccountScenarioPopoutData(): AccountScenarioPopoutData {
  const ctx = useContext(AccountScenarioPopoutDataContext)
  if (!ctx) {
    throw new Error('useAccountScenarioPopoutData must be used within AccountScenarioPopoutDataProvider')
  }
  return ctx
}
