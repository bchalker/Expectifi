import { Button } from '@heroui/react'
import { AppButton } from './ui/AppButton'
import './HoldingScenarioPopout.scss'

export type HoldingScenarioPanelFooterProps = {
  /** When true, left action reads "Remove Scenario" instead of "Do not add a scenario". */
  hasScenario?: boolean
  onNoScenario: () => void
  onDone: () => void
  className?: string
}

/** Modal footer: clear scenario on the left, Done on the right. */
export function HoldingScenarioPanelFooter({
  hasScenario = false,
  onNoScenario,
  onDone,
  className = '',
}: HoldingScenarioPanelFooterProps) {
  return (
    <footer
      className={['holding-scenario-popout__foot', 'holding-scenario-popout__foot--split', className]
        .filter(Boolean)
        .join(' ')}
    >
      <AppButton
        type="button"
        size="sm"
        variant="secondary"
        className="holding-scenario-popout__no-scenario"
        onPress={onNoScenario}
      >
        <span className="holding-scenario-popout__no-scenario-label">
          {hasScenario ? 'Remove Scenario' : 'Do not add a scenario'}
        </span>
      </AppButton>
      <Button
        type="button"
        size="sm"
        variant="primary"
        className="holding-scenario-popout__done"
        onPress={onDone}
      >
        Done
      </Button>
    </footer>
  )
}
