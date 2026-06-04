import { useCallback, useMemo } from 'react'
import { IconArrowRight, IconChevronLeft } from '@tabler/icons-react'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useUserLocale } from '../context/UserLocaleContext'
import { APP_PATHS, navigateApp } from '../lib/appPaths'
import {
  computeIncomeHarvestPreview,
  homeCountrySectionTitle,
  type IncomeHarvestCityRow,
  type IncomeHarvestContextParagraph,
} from '../lib/whereToRetire/incomeHarvestPreview'
import { stashWtrExplorationIncome } from '../lib/whereToRetire/wtrPreviewIncome'
import { fmtMon } from '../utils/format'
import { AppButton } from './ui/AppButton'
import { IncomeHarvestPreviewMap } from './IncomeHarvestPreviewMap'
import './IncomeHarvestPreviewPanel.scss'

const WTR_SCORE_FACTORS =
  'cost of living, quality of life, food prices, healthcare, climate, and tax treatment'

type Props = {
  monthlyIncome: number
  hasStrategiesSelected: boolean
}

function ContextParagraph({ paragraph }: { paragraph: IncomeHarvestContextParagraph }) {
  if (paragraph.kind === 'abroad') {
    return (
      <p className="where-to-retire-preview-panel__context">
        Your income goes further abroad.{' '}
        <span className="where-to-retire-preview-panel__context-emphasis">
          {paragraph.topCityLabel}
        </span>{' '}
        scores {paragraph.scoreDelta} points higher than your best US match. Our Where to Retire
        tool scores each city on {WTR_SCORE_FACTORS} —{' '}
        <span className="where-to-retire-preview-panel__context-emphasis">
          {paragraph.topCityLabel}
        </span>{' '}
        ranks well across all of them at this income level.
      </p>
    )
  }

  if (paragraph.kind === 'international') {
    return (
      <p className="where-to-retire-preview-panel__context">
        At{' '}
        <span className="where-to-retire-preview-panel__context-emphasis tabular-nums">
          {fmtMon(paragraph.monthlyIncome)}
        </span>{' '}
        your strongest matches are all international. Our Where to Retire tool scores each city on{' '}
        {WTR_SCORE_FACTORS} — explore the full list to find your fit.
      </p>
    )
  }

  return (
    <p className="where-to-retire-preview-panel__context">
      Your top domestic matches are competitive with the best worldwide options at this income
      level. Our Where to Retire tool scores each city on {WTR_SCORE_FACTORS} so you can compare
      your options in detail.
    </p>
  )
}

function CityRows({ rows, mobileMax }: { rows: IncomeHarvestCityRow[]; mobileMax: number }) {
  if (rows.length === 0) return null

  return (
    <ul className="where-to-retire-preview-panel__city-list">
      {rows.map((row) => (
        <li
          key={`${row.city}-${row.country}`}
          className={[
            'where-to-retire-preview-panel__city-row',
            row.rank > mobileMax ? 'where-to-retire-preview-panel__city-row--mobile-hide' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="where-to-retire-preview-panel__city-main">
            <span className="where-to-retire-preview-panel__rank">{row.rank}</span>
            {row.flag ? (
              <span className="where-to-retire-preview-panel__flag" aria-hidden>
                {row.flag}
              </span>
            ) : null}
            <span className="where-to-retire-preview-panel__city-label">{row.label}</span>
          </span>
          <span
            className={[
              'where-to-retire-preview-panel__score',
              row.rank === 1 ? 'where-to-retire-preview-panel__score--top' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {row.score}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function IncomeHarvestPreviewPanel({
  monthlyIncome,
  hasStrategiesSelected,
}: Props) {
  const { locale } = useUserLocale()
  const debouncedIncome = useDebouncedValue(monthlyIncome, 300)

  const preview = useMemo(
    () => computeIncomeHarvestPreview(debouncedIncome, locale),
    [debouncedIncome, locale],
  )

  const handleExplore = () => {
    stashWtrExplorationIncome(monthlyIncome)
    navigateApp(APP_PATHS.whereToRetire)
  }

  const handleChooseStrategies = useCallback(() => {
    const list = document.querySelector('.portfolio-account-list--income')
    const firstRow =
      list?.querySelector<HTMLElement>('.income-account-row') ?? list
    firstRow?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    const summary = firstRow?.querySelector<HTMLElement>('summary')
    const details = summary?.closest('details')
    if (details && !details.open) summary?.click()
  }, [])

  const showStrategyCta = !hasStrategiesSelected
  const showSkeleton = !showStrategyCta && !preview.dataReady
  const showLowIncomeHint =
    !showStrategyCta && preview.dataReady && debouncedIncome <= 0
  const showHomeSection =
    !showSkeleton && !showLowIncomeHint && !preview.homeSectionHidden

  return (
    <aside className="where-to-retire-preview-panel" aria-label="Where to Retire preview">
      <header className="where-to-retire-preview-panel__header">
        <h3 className="where-to-retire-preview-panel__title">
          {showStrategyCta ? (
            <>See where your income takes you</>
          ) : (
            <>
              See where{' '}
              <span className="where-to-retire-preview-panel__title-income tabular-nums">
                {fmtMon(monthlyIncome)}
              </span>{' '}
              takes you
            </>
          )}
        </h3>
      </header>

      <div className="where-to-retire-preview-panel__main">
        <IncomeHarvestPreviewMap
          destinations={showStrategyCta ? [] : preview.mapDestinations}
          loading={showSkeleton}
        />

        {showStrategyCta ? (
          <div
            className="where-to-retire-preview-panel__strategy-cta"
            role="region"
            aria-labelledby="where-to-retire-preview-strategy-cta-title"
          >
            <h4
              id="where-to-retire-preview-strategy-cta-title"
              className="where-to-retire-preview-panel__strategy-cta-title"
            >
              Set up your account strategies first
            </h4>
            <p className="where-to-retire-preview-panel__strategy-cta-lead">
              Choose dividend, withdraw, or both for each account on the left. We
              will rank destinations that fit your projected monthly income.
            </p>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              className="where-to-retire-preview-panel__strategy-cta-btn"
              onPress={handleChooseStrategies}
            >
              <IconChevronLeft size={16} stroke={1.5} aria-hidden />
              Choose account strategies
            </AppButton>
          </div>
        ) : showLowIncomeHint ? (
          <p className="where-to-retire-preview-panel__strategy-cta-lead">
            Your strategies are set, but projected monthly income is still zero.
            Check withdrawal rates and fund picks on each account, or add dividend
            or withdraw strategies where needed.
          </p>
        ) : showSkeleton ? (
          <div className="where-to-retire-preview-panel__sections-skeleton" aria-hidden>
            <div className="where-to-retire-preview-panel__skeleton-line" />
            <div className="where-to-retire-preview-panel__skeleton-line where-to-retire-preview-panel__skeleton-line--short" />
            <div className="where-to-retire-preview-panel__skeleton-line" />
            <div className="where-to-retire-preview-panel__skeleton-line where-to-retire-preview-panel__skeleton-line--short" />
          </div>
        ) : (
          <>
            <section className="where-to-retire-preview-panel__section">
              <h4 className="where-to-retire-preview-panel__section-label">Worldwide</h4>
              <CityRows rows={preview.worldwideTop} mobileMax={2} />
            </section>

            {showHomeSection ? (
              <>
                <div className="where-to-retire-preview-panel__divider" aria-hidden />
                <section className="where-to-retire-preview-panel__section">
                  <h4 className="where-to-retire-preview-panel__section-label">
                    {homeCountrySectionTitle(preview.homeCountryLabel)}
                  </h4>
                  <CityRows rows={preview.homeTop} mobileMax={2} />
                </section>
              </>
            ) : null}

            {preview.contextParagraph ? (
              <>
                <div className="where-to-retire-preview-panel__divider" aria-hidden />
                <ContextParagraph paragraph={preview.contextParagraph} />
                <div className="where-to-retire-preview-panel__travel-mark" aria-hidden>
                  <span className="where-to-retire-preview-panel__travel-icon" />
                </div>
              </>
            ) : null}
          </>
        )}
      </div>

      {!showStrategyCta &&
      !showSkeleton &&
      !showLowIncomeHint &&
      preview.qualifyingCount > 0 ? (
        <footer className="where-to-retire-preview-panel__footer">
          <button
            type="button"
            className="where-to-retire-preview-panel__explore"
            onClick={handleExplore}
          >
            Explore your options
            <IconArrowRight size={13} strokeWidth={1.5} aria-hidden />
          </button>
        </footer>
      ) : null}
    </aside>
  )
}
