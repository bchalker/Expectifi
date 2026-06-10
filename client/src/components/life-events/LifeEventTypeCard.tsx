import { useEffect } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { formatCardDetailLine } from './instanceImpact'
import ImpactRatingBadge from './ImpactRatingBadge'
import { LifeEventInstanceEditor } from './LifeEventInstanceEditor'
import { LifeEventInstanceRow } from './LifeEventInstanceRow'
import type {
  LifeEventConfig,
  LifeEventTypeCard as LifeEventTypeCardState,
  TypeCardImpactResult,
} from './types'
import { formatCurrencyCompact } from './utils'

export interface LifeEventTypeCardProps {
  config: LifeEventConfig
  card: LifeEventTypeCardState
  impact: TypeCardImpactResult
  currentYear: number
  retirementYear: number
  retirementPortfolio: number
  growthRate: number
  hsaBalance: number
  onCardChange: (updates: Partial<LifeEventTypeCardState>) => void
  onInstanceChange: (instanceId: string, updates: Partial<LifeEventTypeCardState['instances'][number]>) => void
  onAddInstance: () => void
  onRemoveInstance: (instanceId: string) => void
  onActiveChange: (configId: string, isActive: boolean, futureValue: number) => void
}

export function LifeEventTypeCard({
  config,
  card,
  impact,
  currentYear,
  retirementYear,
  retirementPortfolio,
  growthRate,
  hsaBalance,
  onCardChange,
  onInstanceChange,
  onAddInstance,
  onRemoveInstance,
  onActiveChange,
}: LifeEventTypeCardProps) {
  const isOutflow = config.direction === 'outflow'
  const totalFv = Math.abs(impact.totalFutureValue)
  const impactDisplay =
    totalFv > 0
      ? isOutflow
        ? `−${formatCurrencyCompact(totalFv)}`
        : `+${formatCurrencyCompact(totalFv)}`
      : formatCurrencyCompact(0)

  const detailLine = formatCardDetailLine(config, card, impact.instanceResults)

  useEffect(() => {
    if (card.isActive) {
      onActiveChange(config.id, true, impact.totalFutureValue)
    }
  }, [config.id, card.isActive, impact.totalFutureValue, onActiveChange])

  const cardClassName = [
    'life-events-panel__card',
    'life-events-card',
    card.isActive && 'life-events-panel__card--active',
    card.isExpanded && 'life-events-panel__card--expanded',
    config.group === 'windfalls' && 'life-events-panel__card--windfall',
  ]
    .filter(Boolean)
    .join(' ')

  const headerClassName = [
    'life-events-event__card-header',
    card.isExpanded && 'life-events-event__card-header--expanded',
  ]
    .filter(Boolean)
    .join(' ')

  const toggleExpanded = () => onCardChange({ isExpanded: !card.isExpanded })

  const handleToggleActive = (checked: boolean) => {
    onCardChange({ isActive: checked })
    onActiveChange(config.id, checked, checked ? impact.totalFutureValue : 0)
  }

  return (
    <div className={cardClassName}>
      <div className={headerClassName}>
        <div className="life-events-event__card-header-left">
          <label
            className={[
              'life-events-event__toggle',
              card.isActive && 'life-events-event__toggle--on',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              className="life-events-event__toggle-input"
              checked={card.isActive}
              onChange={(e) => handleToggleActive(e.target.checked)}
              aria-label="Apply event to projection"
            />
            <span className="life-events-event__toggle-track" aria-hidden />
            <span className="life-events-event__toggle-thumb" aria-hidden />
          </label>
          <ImpactRatingBadge rating={impact.highestRating} isOutflow={isOutflow} />
        </div>
        <div className="life-events-event__card-header-right">
          <span
            className={[
              'life-events-event__card-header-impact',
              card.isActive
                ? isOutflow
                  ? 'life-events-event__card-header-impact--active'
                  : 'life-events-event__card-header-impact--inflow'
                : 'life-events-event__card-header-impact--idle',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {impactDisplay}
          </span>
          <button
            type="button"
            className={[
              'life-events-event__chevron',
              card.isExpanded && 'life-events-event__chevron--open',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={toggleExpanded}
            aria-expanded={card.isExpanded}
            aria-label={card.isExpanded ? 'Collapse event details' : 'Expand event details'}
          >
            <IconChevronDown size={16} stroke={1.5} aria-hidden />
          </button>
        </div>
      </div>

      <div className="life-events-event__card-body">
        <p className="life-events-event__label">{config.title}</p>
        {!card.isExpanded ? (
          <p className="life-events-event__sub-label">{detailLine}</p>
        ) : null}
      </div>

      {card.isExpanded ? (
        <div className="life-events-event__detail-drawer">
          {config.supportsMultiple ? (
            <>
              {card.instances.map((instance, index) => {
                const instanceImpact = impact.instanceResults.get(instance.id)
                if (!instanceImpact) return null
                return (
                  <LifeEventInstanceRow
                    key={instance.id}
                    config={config}
                    instance={instance}
                    instanceIndex={index}
                    impact={instanceImpact}
                    currentYear={currentYear}
                    retirementYear={retirementYear}
                    retirementPortfolio={retirementPortfolio}
                    growthRate={growthRate}
                    hsaBalance={hsaBalance}
                    onChange={(updates) => onInstanceChange(instance.id, updates)}
                    onRemove={() => onRemoveInstance(instance.id)}
                  />
                )
              })}
              <div className="life-events-panel__add-instance">
                <button type="button" onClick={onAddInstance}>
                  {config.addInstanceLabel}
                </button>
              </div>
            </>
          ) : (
            card.instances[0] ? (
              <LifeEventInstanceEditor
                config={config}
                instance={card.instances[0]}
                instanceIdPrefix={`life-events-${config.id}-${card.instances[0].id}`}
                currentYear={currentYear}
                retirementYear={retirementYear}
                retirementPortfolio={retirementPortfolio}
                growthRate={growthRate}
                hsaBalance={hsaBalance}
                onChange={(updates) => onInstanceChange(card.instances[0].id, updates)}
              />
            ) : null
          )}
        </div>
      ) : null}
    </div>
  )
}
