import { useMemo, type ReactNode } from 'react'
import {
  IconChartBar,
  IconRotateClockwise,
  IconTrendingDown,
  IconTrendingUp,
} from '@tabler/icons-react'
import {
  annualizedReturnFromYearlyPath,
  blendedBaselineFV,
  decimalToPct,
  modelingCalendarYears,
  POSITION_RETURN_HORIZON,
  projectPositionAtRetirement,
  ratesMatchScenario,
  scenarioRatesDecimal,
  type PositionReturnModel,
  type PositionReturnMode,
  type PositionScenarioId,
} from '../lib/positionReturnModel'
import { fmt } from '../utils/format'
import { InlineSliderRow } from './InlineSliderRow'
import './PositionReturnSliders.scss'

const RETURN_SLIDER_MIN_PCT = -100
const RETURN_SLIDER_MAX_PCT = 50
const RETURN_SLIDER_STEP = 0.5

const MODE_HINTS: Record<PositionReturnMode, string> = {
  flat: 'One rate per year: annualized from the year strip',
  peryear: 'Set a different rate for each year',
  scenario: 'Choose Bear, Base, Bull, or stronger Very Bear / Very Bull paths',
}

const SCENARIO_LABELS: { id: PositionScenarioId; label: string }[] = [
  { id: 'very_bear', label: 'Very Bearish' },
  { id: 'bear', label: 'Bearish' },
  { id: 'base', label: 'Base' },
  { id: 'bull', label: 'Bullish' },
  { id: 'very_bull', label: 'Very Bullish' },
]

function fmtSignedPctFromDecimal(dec: number): string {
  const p = decimalToPct(dec)
  const s = (p >= 0 ? '+' : '') + p.toFixed(1) + '%'
  return s
}

function decimalToSliderPct(dec: number): number {
  const pct = Math.round(dec * 1000) / 10
  return Math.max(RETURN_SLIDER_MIN_PCT, Math.min(RETURN_SLIDER_MAX_PCT, pct))
}

function sliderPctToDecimal(pct: number): number {
  return Math.round(pct * 10) / 1000
}

export type PositionReturnSlidersProps = {
  position: PositionReturnModel
  onPositionChange: (next: PositionReturnModel) => void
  blendedRate: number
  retirementYear: number
  retirementAge: number
  horizon?: number
  variant?: 'popover' | 'embedded'
}

export function PositionReturnSlidersForm({
  position,
  onPositionChange,
  blendedRate,
  retirementYear,
  retirementAge,
  horizon: horizonProp,
  variant = 'embedded',
}: PositionReturnSlidersProps) {
  const horizon = Math.max(1, Math.min(50, horizonProp ?? POSITION_RETURN_HORIZON))
  const years = useMemo(() => modelingCalendarYears(retirementYear, horizon), [retirementYear, horizon])

  const rates = useMemo(() => {
    const y = position.yearlyReturns.slice(0, horizon)
    while (y.length < horizon) y.push(blendedRate)
    return y
  }, [position.yearlyReturns, horizon, blendedRate])

  const projected = useMemo(
    () => projectPositionAtRetirement(position, retirementYear, horizon),
    [position, retirementYear, horizon],
  )
  const blendedFv = useMemo(
    () => blendedBaselineFV(position.currentValue, blendedRate, horizon),
    [position.currentValue, blendedRate, horizon],
  )
  const delta = projected - blendedFv
  const deltaMatchesBlended = Math.abs(delta) < 1

  const setMode = (mode: PositionReturnMode) => {
    if (mode === 'flat') {
      const fr = annualizedReturnFromYearlyPath(rates)
      onPositionChange({
        ...position,
        returnMode: 'flat',
        flatRate: fr,
        scenario: null,
        yearlyReturns: Array.from({ length: horizon }, () => fr),
      })
      return
    }
    if (mode === 'peryear') {
      onPositionChange({
        ...position,
        returnMode: 'peryear',
        scenario: null,
        yearlyReturns: [...rates],
      })
      return
    }
    onPositionChange({
      ...position,
      returnMode: 'scenario',
      scenario: position.scenario ?? null,
      yearlyReturns: [...rates],
    })
  }

  const setFlatFromSlider = (pct: number) => {
    const dec = sliderPctToDecimal(pct)
    onPositionChange({
      ...position,
      returnMode: 'flat',
      flatRate: dec,
      scenario: null,
      yearlyReturns: Array.from({ length: horizon }, () => dec),
    })
  }

  const setYearRate = (index: number, pct: number) => {
    const dec = sliderPctToDecimal(pct)
    const next = [...rates]
    next[index] = dec
    if (position.returnMode === 'scenario' && position.scenario != null) {
      onPositionChange({
        ...position,
        returnMode: 'scenario',
        scenario: position.scenario,
        yearlyReturns: next,
      })
      return
    }
    onPositionChange({
      ...position,
      returnMode: 'peryear',
      scenario: null,
      yearlyReturns: next,
    })
  }

  const applyScenario = (id: PositionScenarioId) => {
    onPositionChange({
      ...position,
      returnMode: 'scenario',
      scenario: id,
      yearlyReturns: scenarioRatesDecimal(id, horizon),
    })
  }

  const scenarioPresetModified =
    position.returnMode === 'scenario' &&
    position.scenario != null &&
    !ratesMatchScenario(position.scenario, rates, horizon)

  const resetScenarioPreset = () => {
    if (position.scenario == null) return
    applyScenario(position.scenario)
  }

  const showPerYearSliders =
    position.returnMode === 'peryear' || (position.returnMode === 'scenario' && position.scenario != null)

  const flatRateForUi =
    position.returnMode === 'flat' ? annualizedReturnFromYearlyPath(rates) : position.flatRate
  const flatSliderPct = decimalToSliderPct(flatRateForUi)
  const modes: { id: PositionReturnMode; label: string; icon?: ReactNode }[] = [
    { id: 'flat', label: 'Flat rate' },
    { id: 'peryear', label: 'Per-year' },
    { id: 'scenario', label: 'Scenario', icon: <IconChartBar size={14} stroke={1.75} aria-hidden /> },
  ]

  return (
    <div
      className={`position-return-sliders__body position-return-form${variant === 'popover' ? ' position-return-form--popover' : ''}`}
    >
      <div className="position-return-assumption">
        <div className="position-return-assumption__label">Return assumption</div>
        <p className="position-return-assumption__hint">How should this position grow between now and retirement?</p>
      </div>

      <div className="position-return-seg" role="group" aria-label="Return modeling mode">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`position-return-seg__btn${position.returnMode === m.id ? ' position-return-seg__btn--active' : ''}`}
            aria-pressed={position.returnMode === m.id}
            onClick={() => setMode(m.id)}
          >
            <span className="position-return-seg__label">
              {m.icon ? <span className="position-return-seg__icon">{m.icon}</span> : null}
              {m.label}
            </span>
            <span className="position-return-seg__hint">{MODE_HINTS[m.id]}</span>
          </button>
        ))}
      </div>

      {position.returnMode === 'flat' ? (
        <InlineSliderRow
          name={`${position.ticker || 'Position'} annual return · all years`}
          valueLabel={fmtSignedPctFromDecimal(flatRateForUi)}
          min={RETURN_SLIDER_MIN_PCT}
          max={RETURN_SLIDER_MAX_PCT}
          step={RETURN_SLIDER_STEP}
          value={flatSliderPct}
          onChange={setFlatFromSlider}
          tickLeft={`${RETURN_SLIDER_MIN_PCT}%`}
          tickRight={`+${RETURN_SLIDER_MAX_PCT}%`}
          zeroHashMark
        />
      ) : null}

      {position.returnMode === 'scenario' ? (
        <div className="position-return-sentiment">
          <div className="position-return-sentiment__label" id={`position-return-sentiment-${position.id}`}>
            Sentiment
          </div>
          <div className="position-return-scenario-wrap">
            <div
              className="position-return-seg position-return-seg--scenario"
              role="group"
              aria-labelledby={`position-return-sentiment-${position.id}`}
            >
              {SCENARIO_LABELS.map(({ id, label }) => {
                const selected = position.scenario === id
                const modified =
                  selected && position.scenario != null && !ratesMatchScenario(position.scenario, rates, horizon)
                return (
                  <button
                    key={id}
                    type="button"
                    className={`position-return-seg__btn${selected ? ' position-return-seg__btn--active' : ''}`}
                    aria-pressed={selected}
                    onClick={() => applyScenario(id)}
                  >
                    <span className="position-return-seg__label">{label}</span>
                    <span className="position-return-seg__hint">{selected && modified ? 'Modified' : '\u00a0'}</span>
                  </button>
                )
              })}
            </div>
            {scenarioPresetModified ? (
              <button
                type="button"
                className="position-return-scenario-reset"
                title="Reset to Bear, Base, or Bull defaults"
                aria-label="Reset scenario to Bear, Base, or Bull defaults"
                onClick={resetScenarioPreset}
              >
                <IconRotateClockwise size={18} stroke={1.75} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showPerYearSliders
        ? years.map((calYear, i) => (
            <InlineSliderRow
              key={`${position.id}-y-${calYear}`}
              name={
                <>
                  <span className="position-return-year__full">{calYear}</span>
                  <span className="position-return-year__short">&apos;{String(calYear).slice(-2)}</span>
                </>
              }
              valueLabel={fmtSignedPctFromDecimal(rates[i] ?? blendedRate)}
              min={RETURN_SLIDER_MIN_PCT}
              max={RETURN_SLIDER_MAX_PCT}
              step={RETURN_SLIDER_STEP}
              value={decimalToSliderPct(rates[i] ?? blendedRate)}
              onChange={(pct) => setYearRate(i, pct)}
              tickLeft={`${RETURN_SLIDER_MIN_PCT}%`}
              tickRight={`+${RETURN_SLIDER_MAX_PCT}%`}
              zeroHashMark
            />
          ))
        : null}

      <div className="position-return-summary">
        <div className="position-return-summary__line">
          <span style={{ color: 'var(--text-muted)' }}>Projected at {retirementAge}</span>
          <span style={{ fontFamily: 'var(--heading)', fontWeight: 600 }}>{fmt(projected)}</span>
        </div>
        <div className="position-return-summary__line" style={{ marginTop: 6 }}>
          <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            vs. blended rate ({fmtSignedPctFromDecimal(blendedRate)} all years)
            {deltaMatchesBlended ? null : delta >= 0 ? (
              <IconTrendingUp size={15} stroke={1.75} aria-hidden style={{ color: 'var(--accent-text)' }} />
            ) : (
              <IconTrendingDown size={15} stroke={1.75} aria-hidden style={{ color: 'var(--danger)' }} />
            )}
          </span>
          {deltaMatchesBlended ? (
            <span className="position-return-summary__delta position-return-summary__delta--neutral">matches portfolio rate</span>
          ) : (
            <span
              className={`position-return-summary__delta${delta >= 0 ? ' position-return-summary__delta--pos' : ' position-return-summary__delta--neg'}`}
            >
              {delta >= 0 ? '+' : ''}
              {fmt(delta)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export type { PositionReturnModel, PositionReturnMode, PositionScenarioId } from '../lib/positionReturnModel'
export { defaultPositionReturns, POSITION_RETURN_HORIZON, calcPositionFV, projectPositionAtRetirement } from '../lib/positionReturnModel'
