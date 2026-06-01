import { IconLibraryPlus, IconTrendingDown, IconTrendingUp } from '@tabler/icons-react'
import {
  ACCOUNT_SCENARIO_SUBLABEL,
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import './FidelityHoldingScenarioPopout.scss'

function scenarioTriggerTrailingIcon(choice: ScenarioUiChoice | typeof SCENARIO_MIXED) {
  if (choice === 'bull' || choice === 'very_bull') return IconTrendingUp
  if (choice === 'bear' || choice === 'very_bear') return IconTrendingDown
  return null
}

export function holdingsScenarioTriggerChoiceClass(
  choice: ScenarioUiChoice | typeof SCENARIO_MIXED,
): string {
  if (choice === 'default' || choice === SCENARIO_MIXED) return ''
  if (choice === 'base') return 'holdings-scenario-trigger--normal'
  return `holdings-scenario-trigger--${choice}`
}

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
}

/** Scenario control button — outline placeholder or white card badge with dot + trend icon. */
export function HoldingsScenarioTrigger({
  label,
  common,
  variant,
  inheritAccent = null,
  rowActive,
  onOpen,
  sublabel = ACCOUNT_SCENARIO_SUBLABEL,
  className = '',
}: HoldingsScenarioTriggerProps) {
  const accentChoice =
    variant === 'outline' && inheritAccent && inheritAccent !== 'default' ? inheritAccent : null
  const badgeChoice = variant === 'badge' ? common : null
  const choiceClass = badgeChoice ? holdingsScenarioTriggerChoiceClass(badgeChoice) : ''
  const shellClass = accentChoice ? holdingsScenarioInheritShellClass(accentChoice) : ''
  const TrailingIcon =
    variant === 'badge' && badgeChoice ? scenarioTriggerTrailingIcon(badgeChoice) : null
  const showDot =
    variant === 'badge' &&
    badgeChoice != null &&
    badgeChoice !== SCENARIO_MIXED &&
    badgeChoice !== 'default'

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
      {variant === 'badge' ? (
        <span className="holdings-scenario-trigger__text">
          <span className="holdings-scenario-trigger__sublabel">{sublabel}</span>
          <span className="holdings-scenario-trigger__label-row">
            {showDot ? (
              <span className="holdings-scenario-trigger__dot" aria-hidden />
            ) : null}
            <span className="holdings-scenario-trigger__label">{label}</span>
            {TrailingIcon ? (
              <span className="holdings-scenario-trigger__trail" aria-hidden>
                <TrailingIcon size={14} stroke={1.5} />
              </span>
            ) : null}
          </span>
        </span>
      ) : (
        <>
          <span className="holdings-scenario-trigger__label">{label}</span>
          <span className="holdings-scenario-trigger__plus" aria-hidden>
            <IconLibraryPlus size={14} stroke={1.5} />
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
}
