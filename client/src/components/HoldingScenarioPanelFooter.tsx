import { Button } from '@heroui/react'
import { AppButton } from './ui/AppButton'
import './FidelityHoldingScenarioPopout.scss'

export type HoldingScenarioPanelFooterProps = {
  globalPct: string
  onNoScenario: () => void
  onDone: () => void
  className?: string
}

/** Modal footer: clear scenario (global rate) on the left, Done on the right. */
export function HoldingScenarioPanelFooter({
  globalPct,
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
        <span className="holding-scenario-popout__no-scenario-text">
          <span className="holding-scenario-popout__no-scenario-label">No scenario</span>
          <span className="holding-scenario-popout__no-scenario-sub">
            Uses your {globalPct}% global rate
          </span>
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
