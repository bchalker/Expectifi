import { IconTrendingDown, IconTrendingUp } from '@tabler/icons-react'
import {
  formatOutlookScenarioRateRange,
  OUTLOOK_SCENARIO_TILES,
  type OutlookScenarioChoice,
} from '../../lib/holdingScenarioApply'
import './AccountScenarioOutlookGrid.scss'

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

function formatPopoutOutlookRange(choice: OutlookScenarioChoice, horizon: number): string {
  return formatOutlookScenarioRateRange(choice, horizon).replace(' … ', ' - ')
}

type Props = {
  horizon: number
  selection: OutlookScenarioChoice | null
  onSelect: (choice: OutlookScenarioChoice) => void
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

export function AccountScenarioOutlookGrid({ horizon, selection, onSelect }: Props) {
  return (
    <div className="account-scenario-outlook-grid" role="listbox" aria-label="Market outlook">
      {OUTLOOK_SCENARIO_TILES.map((tile) => {
        const meta = OUTLOOK_CARD_META[tile.choice]
        const selected = selection === tile.choice
        const range = formatPopoutOutlookRange(tile.choice, horizon)

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
            <span className="account-scenario-outlook-card__range">{range}</span>
          </button>
        )
      })}
    </div>
  )
}
