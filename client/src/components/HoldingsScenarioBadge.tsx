import { IconTransfer, IconTrendingDown, IconTrendingUp } from '@tabler/icons-react'
import {
  SCENARIO_MIXED,
  type ScenarioUiChoice,
} from '../lib/holdingScenarioApply'
import './HoldingScenarioPopout.scss'

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

export type HoldingsScenarioBadgeContentProps = {
  label: string
  choice: ScenarioUiChoice | typeof SCENARIO_MIXED
  /** Badge kicker — e.g. This account, This holding. */
  sublabel?: string
  /** Badge buttons: hide Change row below fold; slide up on hover. */
  showChangeHint?: boolean
}

/** Shared scenario label stack: sublabel, colored dot, name, trend icon. */
export function HoldingsScenarioBadgeContent({
  label,
  choice,
  sublabel,
  showChangeHint = false,
}: HoldingsScenarioBadgeContentProps) {
  const showDot =
    choice !== SCENARIO_MIXED && choice !== 'default'
  const TrailingIcon = scenarioTriggerTrailingIcon(choice)

  const body = (
    <>
      {sublabel ? (
        <span className="holdings-scenario-trigger__sublabel">{sublabel}</span>
      ) : null}
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
      {showChangeHint ? (
        <span className="holdings-scenario-trigger__change-row" aria-hidden>
          <span className="font-xs holdings-scenario-trigger__change-label">Change</span>
        </span>
      ) : null}
    </>
  )

  return (
    <span className="holdings-scenario-trigger__text">
      {showChangeHint ? (
        <>
          <span className="holdings-scenario-trigger__slide">{body}</span>
          <span className="holdings-scenario-trigger__change-icon" aria-hidden>
            <IconTransfer stroke={1.5} />
          </span>
        </>
      ) : (
        body
      )}
    </span>
  )
}

export type HoldingsScenarioBadgeProps = HoldingsScenarioBadgeContentProps & {
  className?: string
}

/** Static scenario badge for panels and popovers — matches badge button chrome/colors. */
export function HoldingsScenarioBadge({
  label,
  choice,
  sublabel,
  className = '',
}: HoldingsScenarioBadgeProps) {
  const choiceClass = holdingsScenarioTriggerChoiceClass(choice)

  return (
    <span
      className={[
        'holdings-scenario-trigger',
        'holdings-scenario-trigger--badge',
        'holdings-scenario-badge--static',
        choiceClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <HoldingsScenarioBadgeContent
        label={label}
        choice={choice}
        sublabel={sublabel}
      />
    </span>
  )
}
