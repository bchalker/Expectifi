import { IconTrendingDown, IconTrendingUp } from '@tabler/icons-react'
import {
  formatOutlookScenarioRateRange,
  OUTLOOK_SCENARIO_TILES,
  type OutlookScenarioChoice,
} from '../../lib/holdingScenarioApply'
import './AccountScenarioOutlookGrid.scss'

/** How outlook presets resolve rates — UI only; calculation paths unchanged. */
export type OutlookRateBasis = 'absolute' | 'relative'

const OUTLOOK_RATE_BASIS_COPY: Record<
  OutlookRateBasis,
  { caption: string; chip: string; ariaLabel: string }
> = {
  absolute: {
    caption: 'Fixed preset rates — independent of your growth slider.',
    chip: 'Fixed rate',
    ariaLabel: 'Market outlook (fixed rates)',
  },
  relative: {
    caption: 'Rates move with your global growth slider.',
    chip: 'vs your rate',
    ariaLabel: 'Market outlook (relative to your rate)',
  },
}

const OUTLOOK_CARD_META: Record<
  OutlookScenarioChoice,
  {
    dotColor: string
    trendColor: string
    trendCount: 0 | 1 | 2
    trendDirection: 'down' | 'up' | null
    fullWidth?: boolean
  }
> = {
  very_bear: {
    dotColor: '#E24B4A',
    trendColor: '#E24B4A',
    trendCount: 2,
    trendDirection: 'down',
  },
  bear: {
    dotColor: '#EF9F27',
    trendColor: '#EF9F27',
    trendCount: 1,
    trendDirection: 'down',
  },
  base: {
    dotColor: 'var(--sky-blue)',
    trendColor: 'var(--sky-blue)',
    trendCount: 0,
    trendDirection: null,
  },
  bull: {
    dotColor: 'var(--green1)',
    trendColor: 'var(--green1)',
    trendCount: 1,
    trendDirection: 'up',
  },
  very_bull: {
    dotColor: '#0F6E56',
    trendColor: '#0F6E56',
    trendCount: 2,
    trendDirection: 'up',
    fullWidth: true,
  },
}

function formatPopoutOutlookRange(
  choice: OutlookScenarioChoice,
  horizon: number,
  globalBlended?: number,
): string {
  return formatOutlookScenarioRateRange(choice, horizon, globalBlended).replace(' … ', ' - ')
}

type Props = {
  horizon: number
  selection: OutlookScenarioChoice | null
  onSelect: (choice: OutlookScenarioChoice) => void
  /**
   * Absolute = account-bucket presets (fixed SCENARIO_PRESETS).
   * Relative = holding presets anchored to the global slider.
   */
  rateBasis: OutlookRateBasis
  /** Required when rateBasis is relative — anchors tile ranges to the slider. */
  globalBlended?: number
}

function OutlookTrendIcons({
  direction,
  count,
  color,
}: {
  direction: 'down' | 'up'
  count: 1 | 2
  color: string
}) {
  const Icon = direction === 'down' ? IconTrendingDown : IconTrendingUp
  return (
    <span className="account-scenario-outlook-card__trends" style={{ color }} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <Icon key={index} size={14} stroke={1.25} />
      ))}
    </span>
  )
}

export function AccountScenarioOutlookGrid({
  horizon,
  selection,
  onSelect,
  rateBasis,
  globalBlended,
}: Props) {
  const basis = OUTLOOK_RATE_BASIS_COPY[rateBasis]
  const rangeBlended = rateBasis === 'relative' ? globalBlended : undefined

  return (
    <div className="account-scenario-outlook">
      <p className="account-scenario-outlook__basis">{basis.caption}</p>
      <div
        className={[
          'account-scenario-outlook-grid',
          `account-scenario-outlook-grid--${rateBasis}`,
        ].join(' ')}
        role="listbox"
        aria-label={basis.ariaLabel}
      >
        {OUTLOOK_SCENARIO_TILES.map((tile) => {
          const meta = OUTLOOK_CARD_META[tile.choice]
          const selected = selection === tile.choice
          const range = formatPopoutOutlookRange(tile.choice, horizon, rangeBlended)

          return (
            <button
              key={tile.choice}
              type="button"
              role="option"
              aria-selected={selected}
              className={[
                'account-scenario-outlook-card',
                meta.fullWidth && 'account-scenario-outlook-card--full',
                selected && 'account-scenario-outlook-card--selected',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(tile.choice)}
            >
              <span className="account-scenario-outlook-card__head">
                <span
                  className="account-scenario-outlook-card__dot"
                  style={{ background: meta.dotColor }}
                  aria-hidden
                />
                <span className="account-scenario-outlook-card__label">{tile.label}</span>
                {meta.trendDirection && meta.trendCount > 0 ? (
                  <OutlookTrendIcons
                    direction={meta.trendDirection}
                    count={meta.trendCount as 1 | 2}
                    color={meta.trendColor}
                  />
                ) : null}
              </span>
              <span className="account-scenario-outlook-card__meta">
                <span className="account-scenario-outlook-card__range">{range}</span>
                <span className="account-scenario-outlook-card__chip">{basis.chip}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
