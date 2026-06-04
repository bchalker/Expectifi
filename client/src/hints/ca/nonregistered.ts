import { hintJoin, hintLink, hintText } from '../segments'
import type { AccountHintDefinition } from '../types'

export const caNonregisteredHint: AccountHintDefinition = {
  countries: ['CA'],
  taxTreatment: 'taxable',
  growthHint: (ctx) => {
    if (ctx.isLargestAccount) {
      return hintJoin([
        hintText(
          'This is your most flexible retirement money. Changes here often have the biggest impact on your plan. ',
        ),
      ])
    }
    return hintJoin([
      hintText('Taxable growth with annual inclusion on dividends and gains. '),
      hintLink('Set a custom rate →', { type: 'scenario', bucket: 'brokerage', tab: 'custom' }),
      hintText(' if you expect this to outperform.'),
    ])
  },
  incomeHint: () =>
    hintJoin([
      hintText(
        'Capital gains and dividends taxed annually. Draw first to minimize tax drag while registered accounts compound. Only 50% of capital gains are taxable.',
      ),
    ]),
}
