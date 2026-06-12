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

export type AccountScenarioOpenState = {
  bucket: AccountScenarioBucketId
  initialTab?: ScenarioIntentTabId
}

type ScenarioPopoutContextValue = {
  accountOpen: AccountScenarioOpenState | null
  openAccountScenario: (
    bucket: AccountScenarioBucketId,
    initialTab?: ScenarioIntentTabId,
  ) => void
  closeAccountScenario: () => void
  isAccountScenarioOpen: (bucket: AccountScenarioBucketId) => boolean
}

const ScenarioPopoutContext = createContext<ScenarioPopoutContextValue | null>(null)

export function ScenarioPopoutProvider({ children }: { children: ReactNode }) {
  const [accountOpen, setAccountOpen] = useState<AccountScenarioOpenState | null>(null)

  const openAccountScenario = useCallback(
    (bucket: AccountScenarioBucketId, initialTab?: ScenarioIntentTabId) => {
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

  const value = useMemo(
    () => ({
      accountOpen,
      openAccountScenario,
      closeAccountScenario,
      isAccountScenarioOpen,
    }),
    [accountOpen, closeAccountScenario, isAccountScenarioOpen, openAccountScenario],
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
