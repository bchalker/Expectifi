import { useMemo } from 'react'
import { Tooltip } from '../Tooltip'
import {
  clampExplorationIncome,
  explorationIncomeMax,
  explorationIncomeMin,
  isAtProjectedExplorationIncome,
  resolveExplorationIncome,
  INCOME_EXPLORE_STEP,
  incomeSliderPct,
} from '../../lib/whereToRetire/budgetExplorationStats'
import { fmt, fmtMon } from '../../utils/format'
import './BudgetExplorationHero.scss'

type Props = {
  planMonthlyIncome: number
  explorationIncome: number
  onExplorationIncomeChange: (income: number) => void
  /** Map view: intro above panel; slider parts for toolbar layout. */
  section?: 'intro' | 'slider' | 'slider-label' | 'slider-rail'
}

export function BudgetExplorationHero({
  planMonthlyIncome,
  explorationIncome,
  onExplorationIncomeChange,
  section = 'slider',
}: Props) {
  const incomeMin = useMemo(
    () => explorationIncomeMin(planMonthlyIncome),
    [planMonthlyIncome],
  )

  const incomeMax = useMemo(
    () => explorationIncomeMax(planMonthlyIncome),
    [planMonthlyIncome],
  )

  const mapIncome = useMemo(
    () => resolveExplorationIncome(planMonthlyIncome, explorationIncome),
    [planMonthlyIncome, explorationIncome],
  )

  const fillWidth = incomeSliderPct(explorationIncome, incomeMin, incomeMax)
  const planMarkerPct = incomeSliderPct(planMonthlyIncome, incomeMin, incomeMax)
  const withinFillWidth = Math.min(fillWidth, planMarkerPct)
  const overFillWidth = Math.max(0, fillWidth - planMarkerPct)
  const showOverFill = overFillWidth > 0
  const planMarkTooltip = `${fmtMon(planMonthlyIncome)} projected income`
  const atProjected = isAtProjectedExplorationIncome(
    planMonthlyIncome,
    explorationIncome,
  )
  const thumbIncome = atProjected ? planMonthlyIncome : mapIncome

  const introBlock = section === 'intro' ? (
    <div className="wtr-budget-hero__intro-stack">
      <p className="wtr-budget-hero__sub font-xs">Based on your projected income</p>
      <h1 id="wtr-budget-hero-title" className="wtr-budget-hero__title">
        Where can you retire on?
      </h1>
      <p className="wtr-budget-hero__intro-value tabular-nums">
        <span className="wtr-budget-hero__intro-value-amount">{fmt(planMonthlyIncome)}</span>
        <span className="wtr-budget-hero__intro-value-suffix">/mo</span>
      </p>
    </div>
  ) : null

  if (section === 'intro') {
    return (
      <header className="wtr-budget-hero wtr-budget-hero--intro" aria-labelledby="wtr-budget-hero-title">
        {introBlock}
      </header>
    )
  }

  const sliderLabelBlock = (
    <div className="wtr-budget-hero__slider-label-block">
      <div className="wtr-budget-hero__slider-label-stack" aria-live="polite">
        <span className="wtr-budget-hero__slider-title">
          {atProjected ? 'Projected income' : 'Custom income'}
        </span>
        <span className="wtr-budget-hero__slider-heading-value tabular-nums">
          {fmtMon(atProjected ? planMonthlyIncome : mapIncome)}
        </span>
      </div>
    </div>
  )

  const sliderRailBlock = (
    <div className="wtr-budget-hero__slider-main">
      <div className="wtr-budget-hero__slider-rail">
        <span className="wtr-budget-hero__tick-edge wtr-budget-hero__tick-edge--min">
          {fmtMon(incomeMin)}
        </span>
        <div className="wtr-budget-hero__track-wrap">
          <div className="wtr-budget-hero__track" aria-hidden />
          <div
            className="wtr-budget-hero__fill-group"
            style={{
              left: '0%',
              width: `${fillWidth}%`,
              gridTemplateColumns: showOverFill
                ? `${withinFillWidth}fr ${overFillWidth}fr`
                : '1fr',
            }}
            aria-hidden
          >
            <div className="wtr-budget-hero__fill wtr-budget-hero__fill--within" />
            {showOverFill ? (
              <div className="wtr-budget-hero__fill wtr-budget-hero__fill--over" />
            ) : null}
          </div>
          <div
            className="wtr-budget-hero__plan-mark-wrap"
            style={{ left: `${planMarkerPct}%` }}
          >
            <Tooltip
              content={planMarkTooltip}
              placement="top"
              showArrow
              contentClassName="wtr-budget-hero__plan-tooltip"
            >
              <button
                type="button"
                className="wtr-budget-hero__plan-mark-hit"
                aria-label={planMarkTooltip}
              >
                <span className="wtr-budget-hero__plan-mark" aria-hidden />
              </button>
            </Tooltip>
          </div>
          <div
            className="wtr-budget-hero__thumb-value-wrap"
            style={{ left: `${fillWidth}%` }}
          >
            <span className="wtr-budget-hero__thumb-value tabular-nums">
              {fmtMon(thumbIncome)}
            </span>
          </div>
          <input
            type="range"
            className="wtr-budget-hero__input"
            min={incomeMin}
            max={incomeMax}
            step={INCOME_EXPLORE_STEP}
            value={explorationIncome}
            aria-label="Monthly retirement income"
            aria-valuetext={fmtMon(mapIncome)}
            onChange={(e) =>
              onExplorationIncomeChange(
                clampExplorationIncome(Number(e.target.value), planMonthlyIncome),
              )
            }
          />
        </div>
        <span className="wtr-budget-hero__tick-edge wtr-budget-hero__tick-edge--max">
          {fmtMon(incomeMax)}
        </span>
      </div>
    </div>
  )

  if (section === 'slider-label') {
    return (
      <div className="wtr-budget-hero wtr-budget-hero--slider-label wtr-budget-hero--embedded">
        {sliderLabelBlock}
      </div>
    )
  }

  if (section === 'slider-rail') {
    return (
      <div className="wtr-budget-hero wtr-budget-hero--slider-rail wtr-budget-hero--embedded">
        {sliderRailBlock}
      </div>
    )
  }

  const sliderBlock = (
    <div className="wtr-budget-hero__slider-card">
      <div className="wtr-budget-hero__slider-row">
        {sliderLabelBlock}
        {sliderRailBlock}
      </div>
    </div>
  )

  return (
    <section className="wtr-budget-hero wtr-budget-hero--slider-only wtr-budget-hero--embedded">
      {sliderBlock}
    </section>
  )
}
