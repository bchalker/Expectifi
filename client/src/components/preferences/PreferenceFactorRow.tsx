import { IconArrowRight, IconPencil } from '@tabler/icons-react'
import { Popover } from '@heroui/react'
import type { ReactNode } from 'react'
import type { ClimatePreferenceDirection, PreferenceStep } from '../../types/preferences'
import {
  CLIMATE_DIRECTION_OPTIONS,
  climateDirectionCardHelper,
  climateDirectionPillClass,
  climateDirectionShortLabel,
} from '../../utils/climatePreferenceCopy'
import type { PreferenceFactorId, PreferencePopoverId } from '../../utils/preferenceFactors'
import {
  getFactorDefinition,
  getFactorLevelCopy,
  preferenceDirectionPopoverId,
  preferenceStepClass,
} from '../../utils/preferenceFactors'
import './PreferenceFactorRow.scss'

type Props = {
  factorId: PreferenceFactorId
  step: PreferenceStep
  onStepChange: (step: PreferenceStep) => void
  climatePreference?: ClimatePreferenceDirection
  onClimatePreferenceChange?: (direction: ClimatePreferenceDirection) => void
  withEnableToggle?: boolean
  enabled?: boolean
  onEnabledChange?: (enabled: boolean) => void
  readOnly?: boolean
  openPopoverId?: PreferencePopoverId | null
  onPopoverChange?: (id: PreferencePopoverId | null) => void
}

type FactorPopoverProps = {
  isOpen: boolean
  popoverId: PreferencePopoverId
  onPopoverChange?: (id: PreferencePopoverId | null) => void
  ariaLabel: string
  triggerClassName: string
  triggerLabel: string
  readOnly?: boolean
  directionLayout?: boolean
  children: ReactNode
}

function renderPillContents(label: string, readOnly: boolean) {
  return (
    <>
      <span>{label}</span>
      {!readOnly ? <IconPencil size={11} stroke={1.5} aria-hidden /> : null}
    </>
  )
}

function FactorPopover({
  isOpen,
  popoverId,
  onPopoverChange,
  ariaLabel,
  triggerClassName,
  triggerLabel,
  readOnly = false,
  directionLayout = false,
  children,
}: FactorPopoverProps) {
  if (readOnly) {
    return <span className={triggerClassName}>{triggerLabel}</span>
  }

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={(next) => onPopoverChange?.(next ? popoverId : null)}
    >
      <Popover.Trigger
        className={['pref-factor-row__popover-trigger', triggerClassName]
          .filter(Boolean)
          .join(' ')}
      >
        {renderPillContents(triggerLabel, false)}
      </Popover.Trigger>
      <Popover.Content
        placement="right"
        offset={8}
        shouldFlip
        className={[
          'pref-factor-row__heroui-popover',
          directionLayout && 'pref-factor-row__heroui-popover--direction',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Popover.Arrow className="pref-factor-row__popover-arrow" />
        <Popover.Dialog
          className="pref-factor-row__popover-dialog"
          aria-label={ariaLabel}
        >
          {children}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

export function PreferenceFactorRow({
  factorId,
  step,
  onStepChange,
  climatePreference,
  onClimatePreferenceChange,
  withEnableToggle = false,
  enabled = true,
  onEnabledChange,
  readOnly = false,
  openPopoverId = null,
  onPopoverChange,
}: Props) {
  const def = getFactorDefinition(factorId)
  const level = getFactorLevelCopy(factorId, step)
  const stepClass = preferenceStepClass(step)
  const isActive = !withEnableToggle || enabled
  const isClimate = factorId === 'climate'
  const direction = climatePreference ?? 'none'
  const directionPopoverId = preferenceDirectionPopoverId(factorId)
  const weightPopoverOpen = openPopoverId === factorId && isActive && !readOnly
  const directionPopoverOpen =
    isClimate &&
    openPopoverId === directionPopoverId &&
    isActive &&
    !readOnly &&
    !!onClimatePreferenceChange

  const showClimateDirection =
    isClimate && (onClimatePreferenceChange != null || readOnly)

  const helperText =
    isClimate && direction !== 'none' && isActive
      ? climateDirectionCardHelper(direction)
      : level.sub

  const pillsInteractive = isActive && !readOnly
  const showPillsRow = isActive || withEnableToggle

  const weightTriggerClass = [
    'pref-factor-row__pill',
    `pref-factor-row__pill--${stepClass}`,
    readOnly && 'pref-factor-row__pill--readonly',
    withEnableToggle && !isActive && 'pref-factor-row__pill--preview',
  ]
    .filter(Boolean)
    .join(' ')

  const directionTriggerClass = [
    'pref-factor-row__pill',
    climateDirectionPillClass(direction),
    readOnly && 'pref-factor-row__pill--readonly',
  ]
    .filter(Boolean)
    .join(' ')

  const weightOptions = (
    <div className="pref-factor-row__options" role="listbox" aria-label={`${def.label} importance`}>
      {def.levels.map((opt, index) => {
        const optStep = index as PreferenceStep
        const selected = step === optStep
        const optClass = preferenceStepClass(optStep)
        return (
          <button
            key={opt.badge}
            type="button"
            role="option"
            aria-selected={selected}
            className={[
              'pref-factor-row__option',
              `pref-factor-row__option--${optClass}`,
              selected && 'pref-factor-row__option--selected',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onStepChange(optStep)}
          >
            <span className="pref-factor-row__opt-label">{opt.badge}</span>
            <span className="pref-factor-row__opt-sub">{opt.sub}</span>
          </button>
        )
      })}
    </div>
  )

  const directionOptions = (
    <div
      className="pref-factor-row__options pref-factor-row__options--direction"
      role="listbox"
      aria-label={`${def.label} climate direction`}
    >
      {CLIMATE_DIRECTION_OPTIONS.map((option) => {
        const selected = direction === option.id
        const optClass = climateDirectionPillClass(option.id)
        return (
          <button
            key={option.id}
            type="button"
            role="option"
            aria-selected={selected}
            className={[
              'pref-factor-row__option',
              'pref-factor-row__option--direction',
              optClass,
              selected && 'pref-factor-row__option--selected',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onClimatePreferenceChange?.(option.id)}
          >
            <span className="pref-factor-row__opt-label">{option.label}</span>
            <span className="pref-factor-row__opt-sub">{option.hint}</span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div
      className={[
        'pref-factor-row',
        withEnableToggle && 'pref-factor-row--with-toggle',
        !isActive && 'pref-factor-row--off',
        readOnly && 'pref-factor-row--readonly',
        isClimate && 'pref-factor-row--climate',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {withEnableToggle && onEnabledChange ? (
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`Include ${def.label}`}
          className={[
            'pref-factor-row__daily-toggle',
            enabled && 'pref-factor-row__daily-toggle--on',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onEnabledChange(!enabled)}
        >
          <span className="pref-factor-row__daily-toggle-thumb" aria-hidden />
        </button>
      ) : null}

      <div className="pref-factor-row__copy">
        <span className="pref-factor-row__name">{def.label}</span>
        <p className="pref-factor-row__helper">{helperText}</p>
      </div>

      {showPillsRow ? (
        <div
          className={[
            'pref-factor-row__pills',
            withEnableToggle && !isActive && 'pref-factor-row__pills--preview',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {showClimateDirection ? (
            <>
              {pillsInteractive && onClimatePreferenceChange ? (
                <FactorPopover
                  isOpen={directionPopoverOpen}
                  popoverId={directionPopoverId}
                  onPopoverChange={onPopoverChange}
                  ariaLabel={`${def.label} climate direction`}
                  triggerClassName={directionTriggerClass}
                  triggerLabel={climateDirectionShortLabel(direction)}
                  directionLayout
                >
                  {directionOptions}
                </FactorPopover>
              ) : (
                <span className={directionTriggerClass}>
                  {climateDirectionShortLabel(direction)}
                </span>
              )}
              <IconArrowRight
                className="pref-factor-row__pill-arrow"
                size={13}
                stroke={1.5}
                aria-hidden
              />
            </>
          ) : null}
          {pillsInteractive ? (
            <FactorPopover
              isOpen={weightPopoverOpen}
              popoverId={factorId}
              onPopoverChange={onPopoverChange}
              ariaLabel={`${def.label} importance`}
              triggerClassName={weightTriggerClass}
              triggerLabel={level.badge}
            >
              {weightOptions}
            </FactorPopover>
          ) : (
            <span className={weightTriggerClass}>{level.badge}</span>
          )}
        </div>
      ) : null}
    </div>
  )
}
