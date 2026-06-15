import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AccountScenarioBucketId } from '../lib/accountReturnScenario'
import type { ScenarioIntentTabId } from '../components/HoldingScenarioIntentTabs'
import { normalizeImportSymbol, type ImportedPositionRow } from '../lib/positionsCsv'

export type AccountScenarioOpenState = {
  bucket: AccountScenarioBucketId
  initialTab?: ScenarioIntentTabId
}

export type HoldingScenarioOpenState = {
  symbol: string
  contributingRows: ImportedPositionRow[]
  initialTab?: ScenarioIntentTabId
}

function holdingSymbolKey(symbol: string): string {
  return normalizeImportSymbol(symbol).toUpperCase()
}

type ScenarioPopoutContextValue = {
  accountOpen: AccountScenarioOpenState | null
  openAccountScenario: (
    bucket: AccountScenarioBucketId,
    initialTab?: ScenarioIntentTabId,
  ) => void
  closeAccountScenario: () => void
  isAccountScenarioOpen: (bucket: AccountScenarioBucketId) => boolean
  holdingOpen: HoldingScenarioOpenState | null
  openHoldingScenario: (
    payload: { symbol: string; contributingRows: ImportedPositionRow[] },
    initialTab?: ScenarioIntentTabId,
  ) => void
  closeHoldingScenario: () => void
  isHoldingScenarioOpen: (symbol: string) => boolean
}

const ScenarioPopoutContext = createContext<ScenarioPopoutContextValue | null>(null)

export function ScenarioPopoutProvider({ children }: { children: ReactNode }) {
  const [accountOpen, setAccountOpen] = useState<AccountScenarioOpenState | null>(null)
  const [holdingOpen, setHoldingOpen] = useState<HoldingScenarioOpenState | null>(null)

  const openAccountScenario = useCallback(
    (bucket: AccountScenarioBucketId, initialTab?: ScenarioIntentTabId) => {
      setHoldingOpen(null)
      setAccountOpen({ bucket, initialTab })
    },
    [],
  )

  const closeAccountScenario = useCallback(() => {
    setAccountOpen(null)
  }, [])

  const isAccountScenarioOpen = useCallback(
    (bucket: AccountScenarioBucketId) => accountOpen?.bucket === bucket,
    [accountOpen],
  )

  const openHoldingScenario = useCallback(
    (
      payload: { symbol: string; contributingRows: ImportedPositionRow[] },
      initialTab?: ScenarioIntentTabId,
    ) => {
      setAccountOpen(null)
      setHoldingOpen({ ...payload, initialTab })
    },
    [],
  )

  const closeHoldingScenario = useCallback(() => {
    setHoldingOpen(null)
  }, [])

  const isHoldingScenarioOpen = useCallback(
    (symbol: string) =>
      holdingOpen != null && holdingSymbolKey(holdingOpen.symbol) === holdingSymbolKey(symbol),
    [holdingOpen],
  )

  const value = useMemo(
    () => ({
      accountOpen,
      openAccountScenario,
      closeAccountScenario,
      isAccountScenarioOpen,
      holdingOpen,
      openHoldingScenario,
      closeHoldingScenario,
      isHoldingScenarioOpen,
    }),
    [
      accountOpen,
      closeAccountScenario,
      closeHoldingScenario,
      holdingOpen,
      isAccountScenarioOpen,
      isHoldingScenarioOpen,
      openAccountScenario,
      openHoldingScenario,
    ],
  )

  return (
    <ScenarioPopoutContext.Provider value={value}>{children}</ScenarioPopoutContext.Provider>
  )
}

export function useScenarioPopout(): ScenarioPopoutContextValue {
  const ctx = useContext(ScenarioPopoutContext)
  if (!ctx) {
    throw new Error('useScenarioPopout must be used within ScenarioPopoutProvider')
  }
  return ctx
}

export function useScenarioPopoutOptional(): ScenarioPopoutContextValue | null {
  return useContext(ScenarioPopoutContext)
}
