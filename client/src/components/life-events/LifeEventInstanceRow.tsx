import { IconChevronDown, IconTrash } from '@tabler/icons-react'
import { formatInstanceRowLabel } from './InstancePrimaryFields'
import { LifeEventInstanceEditor } from './LifeEventInstanceEditor'
import type { InstanceImpactResult, LifeEventConfig, LifeEventInstance } from './types'
import { formatCurrencyCompact } from './utils'

export interface LifeEventInstanceRowProps {
  config: LifeEventConfig
  instance: LifeEventInstance
  instanceIndex: number
  impact: InstanceImpactResult
  currentYear: number
  retirementYear: number
  retirementPortfolio: number
  growthRate: number
  hsaBalance: number
  onChange: (updates: Partial<LifeEventInstance>) => void
  onRemove: () => void
}

export function LifeEventInstanceRow({
  config,
  instance,
  instanceIndex,
  impact,
  currentYear,
  retirementYear,
  retirementPortfolio,
  growthRate,
  hsaBalance,
  onChange,
  onRemove,
}: LifeEventInstanceRowProps) {
  const instanceIdPrefix = `life-events-${config.id}-${instance.id}`
  const instanceNumber = instanceIndex + 1
  const labelText =
    instance.label.trim() || config.labelPlaceholder || `Instance ${instanceNumber}`
  const collapsedLabel = formatInstanceRowLabel(instanceNumber, labelText)
  const isOutflow = config.direction === 'outflow'
  const impactFv = Math.abs(impact.futureValue)
  const impactDisplay =
    impactFv > 0
      ? isOutflow
        ? `−${formatCurrencyCompact(impactFv)}`
        : `+${formatCurrencyCompact(impactFv)}`
      : formatCurrencyCompact(0)

  const toggleExpanded = () => onChange({ isExpanded: !instance.isExpanded })

  return (
    <div
      className={[
        'life-events-instance-row',
        instance.isExpanded && 'life-events-instance-row--expanded',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="life-events-instance-row__header">
        <button
          type="button"
          className={[
            'life-events-instance-row__toggle',
            instance.isExpanded && 'life-events-instance-row__toggle--open',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={toggleExpanded}
          aria-expanded={instance.isExpanded}
        >
          <IconChevronDown size={16} stroke={1.5} aria-hidden />
        </button>
        <button
          type="button"
          className="life-events-instance-row__summary"
          onClick={toggleExpanded}
        >
          <span className="life-events-instance-row__label">{collapsedLabel}</span>
          <span
            className={[
              'life-events-instance-row__impact tabular-nums',
              !isOutflow && 'life-events-instance-row__impact--inflow',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {impactDisplay}
          </span>
        </button>
        {instance.isExpanded ? (
          instance.pendingDelete ? (
            <div className="life-events-instance-row__delete-confirm">
              <span>Remove?</span>
              <button type="button" onClick={onRemove}>
                Yes
              </button>
              <button type="button" onClick={() => onChange({ pendingDelete: false })}>
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="life-events-instance-row__remove"
              onClick={() => onChange({ pendingDelete: true })}
              aria-label="Remove instance"
            >
              <IconTrash size={16} stroke={1.5} aria-hidden />
            </button>
          )
        ) : null}
      </div>

      <div
        className="life-events-instance-row__body"
        aria-hidden={!instance.isExpanded}
      >
        <div className="life-events-instance-row__body-inner">
          <LifeEventInstanceEditor
            config={config}
            instance={instance}
            instanceIdPrefix={instanceIdPrefix}
            currentYear={currentYear}
            retirementYear={retirementYear}
            retirementPortfolio={retirementPortfolio}
            growthRate={growthRate}
            hsaBalance={hsaBalance}
            onChange={onChange}
            instanceNumber={instanceNumber}
            useInstancePrimaryRow
          />
        </div>
      </div>
    </div>
  )
}
