import { useMemo } from 'react'
import { IconArrowBackUp } from '@tabler/icons-react'
import { Tooltip } from '../Tooltip'
import {
  clampExplorationIncome,
  defaultExplorationIncome,
  isAtProjectedExplorationIncome,
  resolveExplorationIncome,
  INCOME_EXPLORE_MAX,
  INCOME_EXPLORE_MIN,
  INCOME_EXPLORE_STEP,
  incomeSliderPct,
} from '../../lib/whereToRetire/budgetExplorationStats'
import { fmtMon } from '../../utils/format'
import './BudgetExplorationHero.scss'

type Props = {
  planMonthlyIncome: number
  explorationIncome: number
  onExplorationIncomeChange: (income: number) => void
  /** Map view: intro above panel; slider = income control in toolbar. */
  section?: 'intro' | 'slider'
}

export function BudgetExplorationHero({
  planMonthlyIncome,
  explorationIncome,
  onExplorationIncomeChange,
  section = 'slider',
}: Props) {
  const mapIncome = useMemo(
    () => resolveExplorationIncome(planMonthlyIncome, explorationIncome),
    [planMonthlyIncome, explorationIncome],
  )

  const fillWidth = incomeSliderPct(explorationIncome)
  const planMarkerPct = incomeSliderPct(planMonthlyIncome)
  const planMarkTooltip = `${fmtMon(planMonthlyIncome)} projected income`
  const resetTooltip = `Reset to ${fmtMon(planMonthlyIncome)} income`
  const atProjected = isAtProjectedExplorationIncome(
    planMonthlyIncome,
    explorationIncome,
  )

  const introBlock = section === 'intro' ? (
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
    </>
  ) : null

  if (section === 'intro') {
    return (
      <header className="wtr-budget-hero wtr-budget-hero--intro" aria-labelledby="wtr-budget-hero-title">
        {introBlock}
      </header>
    )
  }

  const sliderBlock = (
    <div className="wtr-budget-hero__slider-card">
      <div className="wtr-budget-hero__slider-row">
        <div className="wtr-budget-hero__slider-label-block">
          <div className="wtr-budget-hero__slider-label-stack" aria-live="polite">
            <span className="wtr-budget-hero__slider-title">
              {atProjected ? 'Projected income' : 'Custom income'}
            </span>
            <span className="wtr-budget-hero__slider-heading-value">
              {fmtMon(atProjected ? planMonthlyIncome : mapIncome)}
            </span>
          </div>
          {!atProjected ? (
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
                onClick={() =>
                  onExplorationIncomeChange(defaultExplorationIncome(planMonthlyIncome))
                }
              >
                <IconArrowBackUp size={16} stroke={1} aria-hidden />
              </button>
            </Tooltip>
          ) : null}
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
                style={{ left: '0%', width: `${fillWidth}%` }}
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
                className="wtr-budget-hero__input"
                min={INCOME_EXPLORE_MIN}
                max={INCOME_EXPLORE_MAX}
                step={INCOME_EXPLORE_STEP}
                value={explorationIncome}
                aria-label="Monthly retirement income"
                aria-valuetext={fmtMon(mapIncome)}
                onChange={(e) =>
                  onExplorationIncomeChange(clampExplorationIncome(Number(e.target.value)))
                }
              />
            </div>
            <span className="wtr-budget-hero__tick-edge wtr-budget-hero__tick-edge--max">
              {fmtMon(INCOME_EXPLORE_MAX)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <section className="wtr-budget-hero wtr-budget-hero--slider-only wtr-budget-hero--embedded">
      {sliderBlock}
    </section>
  )
}
