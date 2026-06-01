import { useMemo } from 'react'
import { growthPhaseProjectionYears } from '../lib/marketScenarioProjection'
import { padYearlyReturns } from '../lib/positionReturnModel'
import { FidelityYearPctField } from './FidelityHoldingScenarioPopout'
import './ScenarioPerYearGrid.scss'

function ratesMatchGlobal(rate: number, globalBlended: number): boolean {
  return Math.abs(rate - globalBlended) < 1e-4
}

export type ScenarioPerYearGridProps = {
  retirementCalendarYear: number
  yearsToRetirement: number
  globalBlended: number
  yearlyReturns: number[]
  onPatchRates: (nextRates: number[]) => void
}

export function ScenarioPerYearGrid({
  retirementCalendarYear,
  yearsToRetirement,
  globalBlended,
  yearlyReturns,
  onPatchRates,
}: ScenarioPerYearGridProps) {
  const years = useMemo(
    () => growthPhaseProjectionYears(retirementCalendarYear, yearsToRetirement),
    [retirementCalendarYear, yearsToRetirement],
  )

  const rates = useMemo(
    () => padYearlyReturns(yearlyReturns, years.length, globalBlended),
    [globalBlended, yearlyReturns, years.length],
  )

  const globalPct = (globalBlended * 100).toFixed(1)

  return (
    <div className="scenario-per-year-grid">
      <p className="scenario-per-year-grid__hint">
        Unedited years use your{' '}
        <strong className="scenario-per-year-grid__hint-rate">{globalPct}%</strong> global rate.
      </p>
      <div className="scenario-per-year-grid__matrix" role="group" aria-label="Per-year return rates">
        {years.map((calendarYear, index) => {
          const rateDecimal = rates[index] ?? globalBlended
          const isEdited = !ratesMatchGlobal(rateDecimal, globalBlended)

          return (
            <div
              key={calendarYear}
              className={[
                'scenario-per-year-grid__cell',
                isEdited
                  ? 'scenario-per-year-grid__cell--edited'
                  : 'scenario-per-year-grid__cell--inherited',
              ].join(' ')}
            >
              <span className="scenario-per-year-grid__year">{calendarYear}</span>
              <FidelityYearPctField
                calendarYear={calendarYear}
                rateDecimal={rateDecimal}
                onCommitDecimal={(dec) => {
                  const next = [...rates]
                  next[index] = dec
                  onPatchRates(next)
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
