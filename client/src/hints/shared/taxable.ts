import { hintJoin, hintLink, hintText } from '../segments'
import type { AccountHintDefinition } from '../types'

export const sharedTaxableHint: AccountHintDefinition = {
  countries: ['*'],
  taxTreatment: 'taxable',
  growthHint: (ctx) =>
    hintJoin([
      hintText('Taxable account — growth subject to annual tax drag. '),
      hintLink('Adjust scenario →', { type: 'scenario', bucket: ctx.accountType, tab: 'outlook' }),
    ]),
  incomeHint: () => hintJoin([hintText('Draw first to minimize tax impact on other accounts.')]),
}
