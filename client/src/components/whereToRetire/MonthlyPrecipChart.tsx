import { IconCloudRain } from '@tabler/icons-react'
import type { MonthlyClimate } from '../../lib/api/openMeteo'
import {
  findWetSeasonRun,
  hasMonthlyPrecipData,
  monthlyPrecipTotalsMm,
  roundPrecipAxisMax,
  wetSeasonLinearSegments,
} from '../../lib/whereToRetire/climatePrecipChart'
import './MonthlyPrecipChart.scss'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type Props = {
  monthly: MonthlyClimate[]
  className?: string
}

function formatMm(value: number): string {
  return `${Math.round(value)} mm`
}

function segmentStyle(start: number, end: number): { left: string; width: string } {
  const span = end - start + 1
  return {
    left: `${(start / 12) * 100}%`,
    width: `${(span / 12) * 100}%`,
  }
}

export function MonthlyPrecipChart({ monthly, className = '' }: Props) {
  if (!hasMonthlyPrecipData(monthly)) {
    return (
      <div
        className={['wtr-monthly-precip-chart wtr-monthly-precip-chart--empty', className]
          .filter(Boolean)
          .join(' ')}
        role="status"
      >
        <IconCloudRain size={24} stroke={1.5} aria-hidden />
        <p className="wtr-monthly-precip-chart__empty-text">
          Monthly rainfall normals are not yet available for this destination. Coverage is expanding
          as we migrate climate data sources.
        </p>
      </div>
    )
  }

  const monthlyTotals = monthlyPrecipTotalsMm(monthly)
  const wetSeason = findWetSeasonRun(monthlyTotals)
  const wetSegments = wetSeason ? wetSeasonLinearSegments(wetSeason.monthIndices) : []
  const maxTotal = Math.max(...monthlyTotals)
  const axisMax = roundPrecipAxisMax(maxTotal)
  const tickStep = axisMax <= 100 ? 50 : 100
  const ticks: number[] = []
  for (let t = 0; t <= axisMax; t += tickStep) {
    ticks.push(t)
  }

  const wettestIdx = monthlyTotals.reduce(
    (bestIdx, total, idx, arr) => (total > arr[bestIdx] ? idx : bestIdx),
    0,
  )

  const wetSeasonSet = new Set(wetSeason?.monthIndices ?? [])

  return (
    <div
      className={['wtr-monthly-precip-chart', className].filter(Boolean).join(' ')}
      role="img"
      aria-label="Average monthly precipitation totals"
    >
      <div className="wtr-monthly-precip-chart__plot">
        <div className="wtr-monthly-precip-chart__y-axis" aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="wtr-monthly-precip-chart__y-tick tabular-nums"
              style={{ bottom: `${(tick / axisMax) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="wtr-monthly-precip-chart__chart-area">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="wtr-monthly-precip-chart__gridline"
              style={{ bottom: `${(tick / axisMax) * 100}%` }}
              aria-hidden
            />
          ))}

          {wetSegments.map((segment) => (
            <div
              key={`${segment.start}-${segment.end}`}
              className="wtr-monthly-precip-chart__wet-band"
              style={segmentStyle(segment.start, segment.end)}
              aria-hidden
            />
          ))}

          <div className="wtr-monthly-precip-chart__bars">
            {monthlyTotals.map((total, idx) => {
              const heightPct = (total / axisMax) * 100
              return (
                <div key={MONTH_LABELS[idx]} className="wtr-monthly-precip-chart__col">
                  <div className="wtr-monthly-precip-chart__track">
                    {idx === wettestIdx ? (
                      <span className="wtr-monthly-precip-chart__callout tabular-nums">
                        {formatMm(total)}
                      </span>
                    ) : null}
                    <div
                      className={[
                        'wtr-monthly-precip-chart__bar',
                        wetSeasonSet.has(idx) ? 'wtr-monthly-precip-chart__bar--wet' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="wtr-monthly-precip-chart__month-row" aria-hidden>
        {MONTH_LABELS.map((label) => (
          <span key={label} className="wtr-monthly-precip-chart__month-label">{label}</span>
        ))}
      </div>

      {wetSeason && wetSegments.length === 1 ? (
        <div className="wtr-monthly-precip-chart__annotation-row">
          <div
            className="wtr-monthly-precip-chart__wet-annotation"
            style={segmentStyle(wetSegments[0].start, wetSegments[0].end)}
          >
            <IconCloudRain size={16} stroke={1.5} aria-hidden />
            <span className="wtr-monthly-precip-chart__wet-label">Wet season</span>
            <span className="wtr-monthly-precip-chart__wet-total tabular-nums">
              {formatMm(wetSeason.totalMm)}
            </span>
          </div>
        </div>
      ) : wetSeason ? (
        <div className="wtr-monthly-precip-chart__annotation-row">
          <div className="wtr-monthly-precip-chart__wet-annotation wtr-monthly-precip-chart__wet-annotation--full">
            <IconCloudRain size={16} stroke={1.5} aria-hidden />
            <span className="wtr-monthly-precip-chart__wet-label">Wet season</span>
            <span className="wtr-monthly-precip-chart__wet-total tabular-nums">
              {formatMm(wetSeason.totalMm)}
            </span>
          </div>
        </div>
      ) : null}

      {wetSeason ? (
        <div className="wtr-monthly-precip-chart__legend">
          <span className="wtr-monthly-precip-chart__legend-swatch" aria-hidden />
          <span className="wtr-monthly-precip-chart__legend-label">
            Wet season — months above the annual monthly average rainfall
          </span>
        </div>
      ) : null}
    </div>
  )
}
