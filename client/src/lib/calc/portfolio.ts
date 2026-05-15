/**
 * Portfolio growth helpers (per-position compounding). Source of truth: `positionReturnModel.ts`.
 */
export {
  POSITION_RETURN_HORIZON,
  SCENARIO_PRESETS,
  blendedBaselineFV,
  calcPositionFV,
  defaultPositionReturns,
  modelingCalendarYears,
  projectPositionAtRetirement,
  scenarioRatesDecimal,
  ratesMatchScenario,
  calendarRetirementYear,
  padYearlyReturns,
  mergePositionModelsForHoldings,
  mergeBucketIntoAllModels,
  makeFidelityPositionReturnId,
  type PositionReturnModel,
  type PositionReturnMode,
  type PositionScenarioId,
} from '../positionReturnModel'
