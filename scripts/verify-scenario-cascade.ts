/**
 * Verifies growth-mode scenario precedence: holding → account → global.
 * Run: npx tsx scripts/verify-scenario-cascade.ts
 */
import {
  buildAccountReturnScenario,
  formatScenarioCascadeLogLine,
  holdingReturnRateSource,
  holdingScenarioOverridesAccount,
  projectionModelForHolding,
} from '../client/src/lib/accountReturnScenario.ts'
import { applyScenarioUiChoice } from '../client/src/lib/holdingScenarioApply.ts'
import type { PositionReturnModel } from '../client/src/lib/positionReturnModel.ts'
import { projectPositionAtRetirement } from '../client/src/lib/positionReturnModel.ts'

const blended = 0.07
const horizon = 10
const calYear = 2045

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

function seedHolding(ticker: string, idSuffix: string): PositionReturnModel {
  return {
    id: `fid-roth-roth-ira-${ticker}-${idSuffix}`,
    ticker,
    label: ticker,
    currentValue: 10_000,
    accountId: 'roth-ira',
    yearlyReturns: Array.from({ length: horizon }, () => blended),
    returnMode: 'flat',
    flatRate: blended,
    scenario: null,
  }
}

const accountScenario = buildAccountReturnScenario('very_bear', blended, horizon, 0)
assert(accountScenario != null, 'account scenario should be set')

const nasa = applyScenarioUiChoice(seedHolding('NASA', '0'), 'very_bull', blended, horizon, 0)
const mnts = seedHolding('MNTS', '1')

assert(holdingReturnRateSource(nasa, accountScenario, blended) === 'custom', 'NASA uses holding override')
assert(holdingReturnRateSource(mnts, accountScenario, blended) === 'account', 'MNTS uses account scenario')

const nasaProjection = projectionModelForHolding(nasa, accountScenario, blended, horizon)
const mntsProjection = projectionModelForHolding(mnts, accountScenario, blended, horizon)

assert(nasaProjection.scenario === 'very_bull', 'NASA projects with Very Bullish holding scenario')
assert(mntsProjection.scenario === 'very_bear', 'MNTS projects with account Very Bearish scenario')

const nasaFv = projectPositionAtRetirement(nasaProjection, calYear, horizon)
const mntsFv = projectPositionAtRetirement(mntsProjection, calYear, horizon)
const nasaGlobalFv = projectPositionAtRetirement(
  projectionModelForHolding(nasa, accountScenario, blended, horizon, 'bull'),
  calYear,
  horizon,
)

assert(nasaFv !== mntsFv, 'NASA and MNTS should diverge under different effective scenarios')
assert(Math.abs(nasaFv - nasaGlobalFv) < 1, 'NASA holding override should ignore global market scenario')

assert(
  holdingScenarioOverridesAccount(nasa, accountScenario, blended, horizon),
  'NASA should flag as overriding account scenario',
)
assert(
  !holdingScenarioOverridesAccount(mnts, accountScenario, blended, horizon),
  'MNTS should not flag as overriding account scenario',
)

const matchingOverride = applyScenarioUiChoice(seedHolding('MATCH', '2'), 'very_bear', blended, horizon, 0)
assert(
  !holdingScenarioOverridesAccount(matchingOverride, accountScenario, blended, horizon),
  'Matching holding/account scenarios should not show override note',
)

console.log(formatScenarioCascadeLogLine(nasa, accountScenario, blended, horizon))
console.log(formatScenarioCascadeLogLine(mnts, accountScenario, blended, horizon))
console.log(formatScenarioCascadeLogLine(seedHolding('VTI', '3'), undefined, blended, horizon))

console.log('\nScenario cascade audit passed.')
