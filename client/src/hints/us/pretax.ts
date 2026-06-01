import { fmt } from '../../utils/format'
import { hintJoin, hintLink, hintText, hintValue } from '../segments'
import type { AccountHintDefinition } from '../types'

export const usPretaxHint: AccountHintDefinition = {
  countries: ['US'],
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
  incomeHint: (ctx) => {
    const room = fmt(ctx.conversionRoom)
    const roomPerYear = `${room}/yr`
    const lead = hintJoin([
      hintText(
        'Ordinary income on every dollar withdrawn. After your standard deduction you have ',
      ),
      hintValue(`~${roomPerYear}`),
      hintText(' before hitting the next bracket. Draw carefully to stay inside lower rates.'),
    ])
    if (ctx.userHasRoth) {
      return hintJoin([
        ...lead,
        hintText(' Consider converting up to '),
        hintValue(roomPerYear),
        hintText(' to your Roth IRA between ages 62–72 before RMDs begin at 73.'),
      ])
    }
    return hintJoin([
      ...lead,
      hintText(
        ' No Roth IRA to convert into — all Pre-tax withdrawals are taxable. Consider whether opening a Roth makes sense before retirement.',
      ),
    ])
  },
}
