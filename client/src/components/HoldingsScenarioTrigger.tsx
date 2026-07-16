import { IconChartHistogram } from '@tabler/icons-react'
import { forwardRef, type ComponentPropsWithRef } from 'react'
import {
  ACCOUNT_SCENARIO_SUBLABEL,
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import {
  HoldingsScenarioBadgeContent,
  holdingsScenarioTriggerChoiceClass,
} from './HoldingsScenarioBadge'
import './HoldingScenarioPopout.scss'

export { holdingsScenarioTriggerChoiceClass } from './HoldingsScenarioBadge'

function holdingsScenarioInheritShellClass(choice: ScenarioUiChoice): string {
  if (choice === 'base') return 'holdings-scenario-trigger-shell--normal'
  if (choice === 'very_bull') return 'holdings-scenario-trigger-shell--very_bull'
  if (choice === 'very_bear') return 'holdings-scenario-trigger-shell--very_bear'
  return `holdings-scenario-trigger-shell--${choice}`
}

export type HoldingsScenarioTriggerVariant = 'outline' | 'badge'

export type HoldingsScenarioTriggerProps = {
  label: string
  common: ScenarioUiChoice | typeof SCENARIO_MIXED
  variant: HoldingsScenarioTriggerVariant
  /** Left accent shell for outline inherit (non-portfolio layouts only). */
  inheritAccent?: ScenarioUiChoice | null
  rowActive: boolean
  onOpen: () => void
  /** Badge sublabel — account rows vs holding rows. */
  sublabel?: string
  className?: string
  /** Merged when composed inside HeroUI `Popover.Trigger` `render`. */
  triggerSlotProps?: ComponentPropsWithRef<'button'>
}

/** Scenario control button — outline placeholder or white card badge with dot + trend icon. */
export const HoldingsScenarioTrigger = forwardRef<HTMLButtonElement, HoldingsScenarioTriggerProps>(
  function HoldingsScenarioTrigger(
    {
      label,
      common,
      variant,
      inheritAccent = null,
      rowActive,
      onOpen,
      sublabel = ACCOUNT_SCENARIO_SUBLABEL,
      className = '',
      triggerSlotProps,
    },
    forwardedRef,
  ) {
  const accentChoice =
    variant === 'outline' && inheritAccent && inheritAccent !== 'default' ? inheritAccent : null
  const badgeChoice = variant === 'badge' ? common : null
  const choiceClass = badgeChoice ? holdingsScenarioTriggerChoiceClass(badgeChoice) : ''
  const shellClass = accentChoice ? holdingsScenarioInheritShellClass(accentChoice) : ''
  const { ref: slotRef, className: slotClassName, onClick: slotOnClick, ...restSlotProps } =
    triggerSlotProps ?? {}

  const button = (
    <button
      {...restSlotProps}
      ref={slotRef ?? forwardedRef}
      type="button"
      className={[
        'holdings-scenario-trigger',
        variant === 'outline' ? 'holdings-scenario-trigger--outline' : 'holdings-scenario-trigger--badge',
        rowActive && 'holdings-scenario-trigger--open',
        choiceClass,
        slotClassName,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-holdings-scenario-trigger
      aria-expanded={restSlotProps['aria-expanded'] ?? rowActive}
      aria-haspopup={restSlotProps['aria-haspopup'] ?? 'dialog'}
      onClick={(e) => {
        e.stopPropagation()
        if (slotOnClick) {
          slotOnClick(e)
          return
        }
        onOpen()
      }}
    >
      {variant === 'badge' && badgeChoice ? (
        <HoldingsScenarioBadgeContent
          label={label}
          choice={badgeChoice}
          sublabel={sublabel}
          showChangeHint
        />
      ) : (
        <>
          <span className="holdings-scenario-trigger__label">{label}</span>
          <span className="holdings-scenario-trigger__plus" aria-hidden>
            <IconChartHistogram size={14} stroke={1.5} />
          </span>
        </>
      )}
    </button>
  )

  if (!shellClass) return button

  return (
    <div className={['holdings-scenario-trigger-shell', shellClass].join(' ')}>
      <span className="holdings-scenario-trigger-shell__accent" aria-hidden />
      {button}
    </div>
  )
  },
)
