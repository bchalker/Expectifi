import { applyScenarioUiChoice, inferScenarioUiChoice, scenarioColumnShortLabel, type ScenarioUiChoice } from './holdingScenarioApply'
import type { PositionReturnModel } from './positionReturnModel'

/** Holding has its own return path (not global / account inherit). */
export function holdingHasIndividualReturnOverride(
  m: PositionReturnModel,
  blended: number,
  horizon: number,
): boolean {
  if (m.returnOverride === true) return true
  if (m.returnOverride === false) return false
  return inferScenarioUiChoice(m, blended, horizon) !== 'default'
}

function holdingMatchesScenarioChoice(
  m: PositionReturnModel,
  choice: ScenarioUiChoice,
  blended: number,
  horizon: number,
): boolean {
  if (inferScenarioUiChoice(m, blended, horizon) === choice) return true
  if (
    choice === 'custom' &&
    m.returnOverride === true &&
    m.returnMode === 'flat' &&
    inferScenarioUiChoice(m, blended, horizon) === 'default'
  ) {
    return true
  }
  return false
}

/** Holdings in the bucket that already use this scenario choice individually. */
export function countHoldingsWithScenarioChoice(
  models: PositionReturnModel[],
  choice: ScenarioUiChoice,
  blendedForModel: (m: PositionReturnModel) => number,
  horizon: number,
): number {
  if (choice === 'default') return 0
  let count = 0
  for (const m of models) {
    const blended = blendedForModel(m)
    if (holdingMatchesScenarioChoice(m, choice, blended, horizon)) count += 1
  }
  return count
}

/** Reset matching holding-level scenarios to inherit global / account rates. */
export function holdingModelsClearedToDefault(
  models: PositionReturnModel[],
  choice: ScenarioUiChoice,
  blendedForModel: (m: PositionReturnModel) => number,
  horizon: number,
): PositionReturnModel[] {
  const out: PositionReturnModel[] = []
  for (const m of models) {
    const blended = blendedForModel(m)
    if (!holdingMatchesScenarioChoice(m, choice, blended, horizon)) continue
    out.push(applyScenarioUiChoice(m, 'default', blended, horizon, 0))
  }
  return out
}

export function scenarioChoiceConflictLabel(choice: ScenarioUiChoice): string {
  return scenarioColumnShortLabel(choice)
}
