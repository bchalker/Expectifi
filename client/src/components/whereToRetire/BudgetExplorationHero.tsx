import { useMemo } from 'react'
import { IconArrowBackUp } from '@tabler/icons-react'
import { Tooltip } from '../Tooltip'
import { AnimatedCount } from '../ui/AnimatedCount'
import {
  clampExplorationIncomeRange,
  computeBudgetExplorationStats,
  defaultExplorationIncomeRange,
  resolveExplorationIncomeCeiling,
  INCOME_EXPLORE_MAX,
  INCOME_EXPLORE_MIN,
  INCOME_EXPLORE_STEP,
  incomeSliderPct,
  type ExplorationIncomeRange,
} from '../../lib/whereToRetire/budgetExplorationStats'
import { fmt, fmtMon } from '../../utils/format'
import './BudgetExplorationHero.scss'

type Props = {
  planMonthlyIncome: number
  explorationRange: ExplorationIncomeRange
  onExplorationRangeChange: (range: ExplorationIncomeRange) => void
  /** Hero sits inside the combined map panel (no extra card chrome). */
  embedded?: boolean
  /** Map view: intro above panel; panelSummary = stat cards; slider = range only. */
  section?: 'full' | 'intro' | 'panelSummary' | 'slider'
}

function formatExploreIncome(value: number): string {
  return fmt(value).replace('$', '')
}

function formatRangeDisplay(min: number, max: number): string {
  if (min === max) return fmt(min)
  return `${fmt(min)} – ${fmt(max)}`
}

export function BudgetExplorationHero({
  planMonthlyIncome,
  explorationRange,
  onExplorationRangeChange,
  embedded = false,
  section = 'full',
}: Props) {
  const { min: rangeMin, max: rangeMax } = explorationRange

  const planRange = useMemo(
    () => defaultExplorationIncomeRange(planMonthlyIncome),
    [planMonthlyIncome],
  )

  const planStats = useMemo(
    () => computeBudgetExplorationStats(planMonthlyIncome),
    [planMonthlyIncome],
  )

  const incomeCeiling = useMemo(
    () => resolveExplorationIncomeCeiling(planMonthlyIncome, explorationRange),
    [planMonthlyIncome, explorationRange],
  )

  const stats = useMemo(
    () => computeBudgetExplorationStats(incomeCeiling),
    [incomeCeiling],
  )

  const fillLeft = incomeSliderPct(rangeMin)
  const fillWidth = Math.max(0, incomeSliderPct(rangeMax) - fillLeft)
  const planMarkerPct = incomeSliderPct(planMonthlyIncome)
  const planMarkTooltip = `${fmtMon(planMonthlyIncome)} projected income`
  const resetTooltip = `Reset to ${fmtMon(planMonthlyIncome)} income`
  const isPlanRange =
    rangeMin === planRange.min && rangeMax === planRange.max

  const setMin = (nextMin: number) => {
    onExplorationRangeChange(clampExplorationIncomeRange(nextMin, rangeMax))
  }

  const setMax = (nextMax: number) => {
    onExplorationRangeChange(clampExplorationIncomeRange(rangeMin, nextMax))
  }

  const showIntro = section === 'full' || section === 'intro'
  const showPanelSummary = section === 'full' || section === 'panelSummary'
  const showSlider = section === 'full' || section === 'slider'

  const introBlock = showIntro ? (
    <>
      <p className="wtr-budget-hero__note">
        <span className="wtr-budget-hero__note-pill">
          Based on your projected retirement income
        </span>
      </p>

      <h1 id="wtr-budget-hero-title" className="wtr-budget-hero__title">
        Where can you retire on{' '}
        <span className="wtr-budget-hero__title-income">{fmtMon(planMonthlyIncome)}</span>?
      </h1>

      <p className="wtr-budget-hero__subtitle">
        <span className="wtr-budget-hero__subtitle-count">
          <AnimatedCount
            value={planStats.citiesInBudget}
            className="wtr-budget-hero__subtitle-num"
          />
        </span>{' '}
        cities at or below your expected income
      </p>
    </>
  ) : null

  if (section === 'intro') {
    return (
      <header className="wtr-budget-hero wtr-budget-hero--intro" aria-labelledby="wtr-budget-hero-title">
        {introBlock}
      </header>
    )
  }

  const sliderBlock = showSlider ? (
    <div className="wtr-budget-hero__slider-card">
        <div className="wtr-budget-hero__slider-label-block">
          <span className="wtr-budget-hero__slider-kicker">
            {isPlanRange ? 'Monthly income range' : 'Custom: Monthly income range'}
          </span>
          <div className="wtr-budget-hero__slider-amount-row">
            <span className="wtr-budget-hero__slider-amount" aria-live="polite">
              {isPlanRange
                ? fmtMon(planMonthlyIncome)
                : formatRangeDisplay(rangeMin, rangeMax)}
            </span>
            {!isPlanRange ? (
              <Tooltip
                content={resetTooltip}
                placement="top"
                showArrow
                contentClassName="wtr-budget-hero__plan-tooltip"
              >
                <button
                  type="button"
                  className="wtr-budget-hero__reset"
                  aria-label={resetTooltip}
                  onClick={() => onExplorationRangeChange(planRange)}
                >
                  <IconArrowBackUp size={16} stroke={1} aria-hidden />
                </button>
              </Tooltip>
            ) : null}
          </div>
        </div>

        <div className="wtr-budget-hero__slider-main">
        <div className="wtr-budget-hero__slider-rail">
          <span className="wtr-budget-hero__tick-edge wtr-budget-hero__tick-edge--min">
            {fmtMon(INCOME_EXPLORE_MIN)}
          </span>
          <div className="wtr-budget-hero__track-wrap">
            <div className="wtr-budget-hero__track" aria-hidden />
            <div
              className="wtr-budget-hero__fill"
              style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
              aria-hidden
            />
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
            <input
              type="range"
              className="wtr-budget-hero__input wtr-budget-hero__input--min"
              min={INCOME_EXPLORE_MIN}
              max={INCOME_EXPLORE_MAX}
              step={INCOME_EXPLORE_STEP}
              value={rangeMin}
              aria-label="Minimum monthly income"
              onChange={(e) => setMin(Number(e.target.value))}
            />
            <input
              type="range"
              className="wtr-budget-hero__input wtr-budget-hero__input--max"
              min={INCOME_EXPLORE_MIN}
              max={INCOME_EXPLORE_MAX}
              step={INCOME_EXPLORE_STEP}
              value={rangeMax}
              aria-label="Maximum monthly income"
              onChange={(e) => setMax(Number(e.target.value))}
            />
          </div>
          <span className="wtr-budget-hero__tick-edge wtr-budget-hero__tick-edge--max">
            {fmtMon(INCOME_EXPLORE_MAX)}
          </span>
        </div>

        </div>
    </div>
  ) : null

  const panelSummaryBlock = showPanelSummary ? (
    <>
      <div className="wtr-budget-hero__stats">
        <article className="wtr-budget-hero__stat">
          <span className="wtr-budget-hero__stat-label">cities in budget</span>
          <span className="wtr-budget-hero__stat-value">
            <AnimatedCount value={planStats.citiesInBudget} />
          </span>
          <span className="wtr-budget-hero__stat-foot wtr-budget-hero__stat-foot--positive">
            {planStats.shareOfAllPct}% of all cities
          </span>
          <span className="wtr-budget-hero__stat-note">At your projected income</span>
        </article>

        <article className="wtr-budget-hero__stat">
          <span className="wtr-budget-hero__stat-label">cheapest option</span>
          <span className="wtr-budget-hero__stat-value">
            {stats.citiesInBudget > 0 ? fmtMon(stats.cheapestBudget) : '—'}
          </span>
          <span className="wtr-budget-hero__stat-foot">{stats.cheapestLabel}</span>
        </article>

        <article className="wtr-budget-hero__stat">
          <span className="wtr-budget-hero__stat-label">best surplus</span>
          <span className="wtr-budget-hero__stat-value">
            {stats.citiesInBudget > 0 ? `+${formatExploreIncome(stats.bestSurplus)}` : '—'}
          </span>
          <span className="wtr-budget-hero__stat-foot">vs. cheapest city</span>
        </article>

        <article className="wtr-budget-hero__stat">
          <span className="wtr-budget-hero__stat-label">top region</span>
          <span className="wtr-budget-hero__stat-value">{stats.topRegion ?? '—'}</span>
          <span className="wtr-budget-hero__stat-foot">most matching cities</span>
        </article>
      </div>
    </>
  ) : null

  if (section === 'slider') {
    return (
      <section className="wtr-budget-hero wtr-budget-hero--slider-only wtr-budget-hero--embedded">
        {sliderBlock}
      </section>
    )
  }

  if (section === 'panelSummary') {
    return (
      <section className="wtr-budget-hero wtr-budget-hero--panel-summary wtr-budget-hero--embedded">
        {panelSummaryBlock}
      </section>
    )
  }

  return (
    <section
      className={['wtr-budget-hero', embedded && 'wtr-budget-hero--embedded'].filter(Boolean).join(' ')}
      aria-labelledby={showIntro ? 'wtr-budget-hero-title' : undefined}
    >
      {introBlock}
      {sliderBlock}
      {panelSummaryBlock}
    </section>
  )
}
