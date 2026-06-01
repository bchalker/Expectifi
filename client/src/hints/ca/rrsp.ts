import { hintJoin, hintLink, hintText } from '../segments'
import type { AccountHintDefinition } from '../types'

export const caRrspHint: AccountHintDefinition = {
  countries: ['CA'],
  taxTreatment: 'taxDeferred',
  growthHint: (ctx) => {
    if (ctx.accountScenarioActive && ctx.accountScenario) {
      return hintJoin([
        hintText(`Using ${ctx.accountScenario} scenario. `),
        hintLink('Change →', { type: 'scenario', bucket: 'pretax', tab: 'outlook' }),
      ])
    }
    return hintJoin([
      hintText('Tax-deferred compounding — no annual drag until withdrawal. '),
      hintLink("Fine-tune this account's growth →", {
        type: 'scenario',
        bucket: 'pretax',
        tab: 'custom',
      }),
    ])
  },
  incomeHint: () =>
    hintJoin([
      hintText(
        'Withdrawals taxed as ordinary income. Converts to RRIF at 71 with mandatory minimums. Draw strategically before CPP and OAS kick in to use lower bracket room.',
      ),
    ]),
}
