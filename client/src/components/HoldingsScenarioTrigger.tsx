import { IconEdit } from '@tabler/icons-react'
import {
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import './FidelityHoldingScenarioPopout.scss'

export function holdingsScenarioTriggerChoiceClass(
  choice: ScenarioUiChoice | typeof SCENARIO_MIXED,
): string {
  if (choice === 'default' || choice === SCENARIO_MIXED) return ''
  if (choice === 'base') return 'holdings-scenario-trigger--normal'
  return `holdings-scenario-trigger--${choice}`
}

function holdingsScenarioInheritShellClass(choice: ScenarioUiChoice): string {
  if (choice === 'base') return 'holdings-scenario-trigger-shell--normal'
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
  className?: string
}

/** Scenario control button — outline placeholder or colored badge with edit icon. */
export function HoldingsScenarioTrigger({
  label,
  common,
  variant,
  inheritAccent = null,
  rowActive,
  onOpen,
  className = '',
}: HoldingsScenarioTriggerProps) {
  const accentChoice =
    variant === 'outline' && inheritAccent && inheritAccent !== 'default' ? inheritAccent : null
  const badgeChoice = variant === 'badge' ? common : null
  const choiceClass = badgeChoice ? holdingsScenarioTriggerChoiceClass(badgeChoice) : ''
  const shellClass = accentChoice ? holdingsScenarioInheritShellClass(accentChoice) : ''

  const button = (
    <button
      type="button"
      className={[
        'holdings-scenario-trigger',
        variant === 'outline' ? 'holdings-scenario-trigger--outline' : 'holdings-scenario-trigger--badge',
        choiceClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-holdings-scenario-trigger
      aria-expanded={rowActive}
      aria-haspopup="dialog"
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
    >
      <span className="holdings-scenario-trigger__label">{label}</span>
      {variant === 'badge' ? (
        <span className="holdings-scenario-trigger__edit" aria-hidden>
          <IconEdit size={12} stroke={1.5} />
        </span>
      ) : null}
    </button>
  )

  if (!shellClass) return button

  return (
    <div className={['holdings-scenario-trigger-shell', shellClass].join(' ')}>
      <span className="holdings-scenario-trigger-shell__accent" aria-hidden />
      {button}
    </div>
  )
}
