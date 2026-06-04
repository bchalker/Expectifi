import { hintJoin, hintText } from '../segments'
import type { AccountHintDefinition } from '../types'

export const caRrspHint: AccountHintDefinition = {
  countries: ['CA'],
  taxTreatment: 'taxDeferred',
  growthHint: (ctx) => {
    if (ctx.accountScenarioActive && ctx.accountScenario) {
      return hintJoin([hintText(`Using ${ctx.accountScenario} scenario. `)])
    }
    return hintJoin([
      hintText(
        'Taxes are deferred, helping more of your money stay invested over time. ',
      ),
    ])
  },
  incomeHint: () =>
    hintJoin([
      hintText(
        'Withdrawals taxed as ordinary income. Converts to RRIF at 71 with mandatory minimums. Draw strategically before CPP and OAS kick in to use lower bracket room.',
      ),
    ]),
}
