import { useEffect, useMemo, useState } from 'react'
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

  const targetPercent = comparison?.showBar ? comparison.visualPercent : 0
  const [fillPercent, setFillPercent] = useState(0)

  useEffect(() => {
    if (!comparison?.showBar) {
      setFillPercent(0)
      return
    }
    const frame = requestAnimationFrame(() => {
      setFillPercent(targetPercent)
    })
    return () => cancelAnimationFrame(frame)
  }, [comparison?.showBar, targetPercent])

  if (!comparison?.showBar) return null

  const fillScale = Math.max(0, Math.min(1, fillPercent / 100))

  return (
    <div className="onboarding-savings-comparison" role="status">
      <p className="onboarding-savings-comparison__headline">{comparison.headline}</p>
      <div
        className="onboarding-savings-comparison__track"
        aria-hidden
      >
        <div
          className="onboarding-savings-comparison__fill"
          style={{ transform: `scaleX(${fillScale})` }}
        />
      </div>
      <p className="onboarding-savings-comparison__source">
        Source: Vanguard How America Saves 2024
      </p>
    </div>
  )
}
