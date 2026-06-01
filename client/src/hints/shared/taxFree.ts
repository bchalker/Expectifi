import { hintJoin, hintLink, hintText } from '../segments'
import type { AccountHintDefinition } from '../types'

export const sharedTaxFreeHint: AccountHintDefinition = {
  countries: ['*'],
  taxTreatment: 'taxFree',
  growthHint: (ctx) =>
    hintJoin([
      hintText('Tax-free growth — no drag ever. '),
      hintLink('Adjust scenario →', { type: 'scenario', bucket: ctx.accountType, tab: 'outlook' }),
    ]),
  incomeHint: () =>
    hintJoin([hintText('Most flexible account — tax-free withdrawals at any time.')]),
}
