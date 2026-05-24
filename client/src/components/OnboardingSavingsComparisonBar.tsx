import { useMemo } from 'react'
import { savingsComparisonForAge } from '../lib/onboardingSavingsPercentile'
import './OnboardingSavingsComparisonBar.scss'

type Props = {
  totalSavings: number
  age: number | null
}

export function OnboardingSavingsComparisonBar({ totalSavings, age }: Props) {
  const comparison = useMemo(() => {
    if (age == null) return null
    return savingsComparisonForAge(totalSavings, age)
  }, [totalSavings, age])

  if (!comparison?.showBar) return null

  return (
    <div className="onboarding-savings-comparison" role="status">
      <p className="onboarding-savings-comparison__headline">{comparison.headline}</p>
      <div
        className="onboarding-savings-comparison__track"
        aria-hidden
      >
        <div
          className="onboarding-savings-comparison__fill"
          style={{ width: `${comparison.visualPercent}%` }}
        />
      </div>
      <p className="onboarding-savings-comparison__source">
        Source: Vanguard How America Saves 2024
      </p>
    </div>
  )
}
