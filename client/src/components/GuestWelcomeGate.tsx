import { useCallback, useState, type PropsWithChildren } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import { getInitialCalculatorInputs } from '../lib/initialCalculatorInputs'
import { shouldSkipWelcome } from '../lib/welcomeGate'
import { OnboardingOverlay } from './OnboardingOverlay'

export function GuestWelcomeGate({ children }: PropsWithChildren) {
  const [welcomeDone, setWelcomeDone] = useState(() =>
    shouldSkipWelcome({ inputs: getInitialCalculatorInputs() }),
  )
  const [inputs, setInputsState] = useState<CalculatorInputs>(() => getInitialCalculatorInputs())
  const setInputs = useCallback((p: Partial<CalculatorInputs>) => {
    setInputsState((s) => ({ ...s, ...p }))
  }, [])

  if (!welcomeDone) {
    return (
      <OnboardingOverlay
        inputs={inputs}
        setInputs={setInputs}
        onComplete={() => setWelcomeDone(true)}
      />
    )
  }

  return <>{children}</>
}
