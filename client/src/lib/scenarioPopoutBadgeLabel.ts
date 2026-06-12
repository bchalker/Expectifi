import {
  getOutlookScenarioTileLabel,
  isOutlookScenarioChoice,
  type ScenarioUiChoice,
} from './holdingScenarioApply'
import { decimalToPct } from './positionReturnModel'

/** Compact badge label for scenario row triggers. */
export function scenarioPopoutBadgeLabel(
  choice: ScenarioUiChoice,
  customPctDecimal?: number,
): string | null {
  if (choice === 'default') return null
  if (choice === 'peryear') return 'Per year'
  if (choice === 'custom') {
    if (customPctDecimal != null && Number.isFinite(customPctDecimal)) {
      return `${decimalToPct(customPctDecimal).toFixed(1)}%`
    }
    return null
  }
  if (isOutlookScenarioChoice(choice)) {
    return getOutlookScenarioTileLabel(choice)
  }
  return null
}
