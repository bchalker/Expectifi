import type { ComponentType } from 'react'
import { IconCloudRain, IconSun, IconWind } from '@tabler/icons-react'
import type { MonthlyClimate } from '../../lib/api/openMeteo'
import {
  comfortBandForPreference,
  formatChartAxisTick,
  formatChartTemp,
  monthInComfortBand,
  roundAxisMax,
  roundAxisMin,
  tempInDisplayUnit,
  axisTickStep,
} from '../../lib/whereToRetire/climateChartComfort'
import type { SeasonCard, SeasonKey } from '../../utils/climateDetail'
import { seasonDividerAfterIndices } from '../../utils/climateDetail'
import './ClimateMonthlyChart.scss'

type TablerIconProps = {
  size?: number | string
  stroke?: number | string
}

const SEASON_ICONS: Record<SeasonKey, ComponentType<TablerIconProps>> = {
  winter: IconCloudRain,
  spring: IconWind,
  summer: IconSun,
  fall: IconWind,
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type Props = {
  monthly: MonthlyClimate[]
  lat: number
  seasons: SeasonCard[]
  tempUnit: 'c' | 'f'
  climatePreferenceStep: number
  climatePreferenceDirection: import('../../types/preferences').ClimatePreferenceDirection
  className?: string
}

function SeasonIcon({ season }: { season: SeasonKey }) {
  const Icon = SEASON_ICONS[season]
  return (
    <span className={`wtr-weather-tab__season-icon wtr-weather-tab__season-icon--${season}`} aria-hidden>
      <Icon size={18} stroke={1.5} />
    </span>
  )
}

function yPercent(valueC: number, domainMin: number, domainSpread: number): number {
  return ((valueC - domainMin) / domainSpread) * 100
}

export function ClimateMonthlyChart({
  monthly,
  lat,
  seasons,
  tempUnit,
  climatePreferenceStep,
  climatePreferenceDirection,
  className = '',
}: Props) {
  const comfortBand = comfortBandForPreference(
    climatePreferenceStep,
    climatePreferenceDirection,
    tempUnit,
  )
  const tempMin = Math.min(...monthly.map((m) => tempInDisplayUnit(m.avgLowC, tempUnit)))
  const tempMax = Math.max(...monthly.map((m) => tempInDisplayUnit(m.avgHighC, tempUnit)))
  const bandMin = comfortBand ? tempInDisplayUnit(comfortBand.minC, tempUnit) : tempMin
  const bandMax = comfortBand ? tempInDisplayUnit(comfortBand.maxC, tempUnit) : tempMax
  const provisionalMin = Math.min(tempMin, bandMin)
  const provisionalMax = Math.max(tempMax, bandMax)
  const tickStep = axisTickStep(provisionalMin, provisionalMax, tempUnit)
  const axisMin = roundAxisMin(provisionalMin, tickStep)
  const axisMax = roundAxisMax(provisionalMax, tickStep)
  const domainSpread = axisMax - axisMin || 1

  const ticks: number[] = []
  for (let t = axisMin; t <= axisMax; t += tickStep) {
    ticks.push(t)
  }

  const dividerIndices = seasonDividerAfterIndices(lat)

  const minLowMonthIdx = monthly.reduce(
    (bestIdx, m, idx, arr) => (m.avgLowC < arr[bestIdx].avgLowC ? idx : bestIdx),
    0,
  )
  const maxHighMonthIdx = monthly.reduce(
    (bestIdx, m, idx, arr) => (m.avgHighC > arr[bestIdx].avgHighC ? idx : bestIdx),
    0,
  )

  const comfortBottomPct = comfortBand ? yPercent(tempInDisplayUnit(comfortBand.minC, tempUnit), axisMin, domainSpread) : 0
  const comfortTopPct = comfortBand ? yPercent(tempInDisplayUnit(comfortBand.maxC, tempUnit), axisMin, domainSpread) : 0
  const comfortHeightPct = comfortBand ? comfortTopPct - comfortBottomPct : 0

  return (
    <div
      className={['wtr-climate-monthly-chart', className].filter(Boolean).join(' ')}
      role="img"
      aria-label="Average monthly temperature range with seasonal breakdown"
    >
      <div className="wtr-climate-monthly-chart__plot">
        <div className="wtr-climate-monthly-chart__y-axis" aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="wtr-climate-monthly-chart__y-tick tabular-nums"
              style={{ bottom: `${yPercent(tick, axisMin, domainSpread)}%` }}
            >
              {formatChartAxisTick(tick, tempUnit)}
            </span>
          ))}
        </div>

        <div className="wtr-climate-monthly-chart__chart-area">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="wtr-climate-monthly-chart__gridline"
              style={{ bottom: `${yPercent(tick, axisMin, domainSpread)}%` }}
              aria-hidden
            />
          ))}

          {comfortBand ? (
            <div
              className="wtr-climate-monthly-chart__comfort-band"
              style={{
                bottom: `${comfortBottomPct}%`,
                height: `${comfortHeightPct}%`,
              }}
              aria-hidden
            />
          ) : null}

          {dividerIndices.map((afterIdx) => (
            <div
              key={afterIdx}
              className="wtr-climate-monthly-chart__divider"
              style={{ left: `${((afterIdx + 1) / 12) * 100}%` }}
              aria-hidden
            />
          ))}

          <div className="wtr-climate-monthly-chart__bars">
            {monthly.map((m, idx) => {
              const lowDisplay = tempInDisplayUnit(m.avgLowC, tempUnit)
              const highDisplay = tempInDisplayUnit(m.avgHighC, tempUnit)
              const lowPct = yPercent(lowDisplay, axisMin, domainSpread)
              const highPct = yPercent(highDisplay, axisMin, domainSpread)
              const bandPct = Math.max(0.5, highPct - lowPct)
              const inComfort = comfortBand ? monthInComfortBand(m.avgHighC, m.avgLowC, comfortBand) : false
              return (
                <div key={m.monthLabel} className="wtr-climate-monthly-chart__col">
                  <div className="wtr-climate-monthly-chart__track">
                    {idx === minLowMonthIdx ? (
                      <span
                        className="wtr-climate-monthly-chart__callout wtr-climate-monthly-chart__callout--low tabular-nums"
                        style={{ bottom: `${lowPct}%` }}
                      >
                        {formatChartTemp(m.avgLowC, tempUnit)}
                      </span>
                    ) : null}
                    {idx === maxHighMonthIdx ? (
                      <span
                        className="wtr-climate-monthly-chart__callout wtr-climate-monthly-chart__callout--high tabular-nums"
                        style={{ bottom: `${highPct}%` }}
                      >
                        {formatChartTemp(m.avgHighC, tempUnit)}
                      </span>
                    ) : null}
                    <div
                      className={[
                        'wtr-climate-monthly-chart__band',
                        inComfort ? 'wtr-climate-monthly-chart__band--comfort' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{ bottom: `${lowPct}%`, height: `${bandPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="wtr-climate-monthly-chart__month-row" aria-hidden>
        {MONTH_LABELS.map((label) => (
          <span key={label} className="wtr-climate-monthly-chart__month-label">{label}</span>
        ))}
      </div>

      <div className="wtr-climate-monthly-chart__season-row">
        {seasons.map((season) => (
          <div key={season.season} className="wtr-climate-monthly-chart__season-col">
            <div className="wtr-climate-monthly-chart__season-head">
              <SeasonIcon season={season.season} />
              <span className="wtr-climate-monthly-chart__season-name">{season.seasonLabel}</span>
            </div>
            <span className={`wtr-weather-tab__season-tag wtr-weather-tab__season-tag--${season.tagTone}`}>
              {season.tagLabel}
            </span>
          </div>
        ))}
      </div>

      {comfortBand ? (
        <div className="wtr-climate-monthly-chart__legend">
          <span className="wtr-climate-monthly-chart__legend-swatch" aria-hidden />
          <span className="wtr-climate-monthly-chart__legend-label">{comfortBand.legendLabel}</span>
        </div>
      ) : null}
    </div>
  )
}
