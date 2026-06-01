import { hintJoin, hintLink, hintText } from '../segments'
import type { AccountHintDefinition } from '../types'

export const sharedTaxDeferredHint: AccountHintDefinition = {
  countries: ['*'],
  taxTreatment: 'taxDeferred',
  growthHint: (ctx) =>
    hintJoin([
      hintText('Tax-deferred growth — no drag until withdrawal. '),
      hintLink('Fine-tune growth rate →', { type: 'scenario', bucket: ctx.accountType, tab: 'custom' }),
    ]),
  incomeHint: () => hintJoin([hintText('Withdrawals taxed as ordinary income. Draw within your bracket.')]),
}
