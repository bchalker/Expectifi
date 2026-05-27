import type { MonthlyClimate } from '../../lib/api/openMeteo'
import './ClimateMonthlyChart.scss'

type Props = {
  monthly: MonthlyClimate[]
  className?: string
}

/** Monthly low–high temperature bands (CSS bars, no chart library). */
export function ClimateMonthlyChart({ monthly, className = '' }: Props) {
  const tempMin = Math.min(...monthly.map((m) => m.avgLowC))
  const tempMax = Math.max(...monthly.map((m) => m.avgHighC))
  const spread = tempMax - tempMin
  const pad = spread > 0 ? spread * 0.06 : 1
  const domainMin = tempMin - pad
  const domainMax = tempMax + pad
  const domainSpread = domainMax - domainMin || 1

  return (
    <div
      className={['wtr-climate-monthly-chart', className].filter(Boolean).join(' ')}
      role="img"
      aria-label="Average monthly temperature range"
    >
      <div className="wtr-climate-monthly-chart__bars">
        {monthly.map((m) => {
          const lowPct = ((m.avgLowC - domainMin) / domainSpread) * 100
          const highPct = ((m.avgHighC - domainMin) / domainSpread) * 100
          const bandPct = Math.max(0.5, highPct - lowPct)
          return (
            <div key={m.monthLabel} className="wtr-climate-monthly-chart__col">
              <div className="wtr-climate-monthly-chart__track">
                <div
                  className="wtr-climate-monthly-chart__band"
                  style={{ bottom: `${lowPct}%`, height: `${bandPct}%` }}
                />
              </div>
              <span className="wtr-climate-monthly-chart__label">{m.monthLabel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
