import { fmtMon } from '../../utils/format'
import { hintJoin, hintLink, hintText, hintValue } from '../segments'
import type { AccountHintDefinition } from '../types'

export const usBrokerageHint: AccountHintDefinition = {
  countries: ['US'],
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
      hintText('Taxable growth with capital gains drag. '),
      hintLink('Set a custom rate →', { type: 'scenario', bucket: 'brokerage', tab: 'custom' }),
      hintText(' if you expect this to outperform.'),
    ])
  },
  incomeHint: (ctx) => {
    if (ctx.hasSSConfigured && ctx.ssMonthlyAmount > 0) {
      return hintJoin([
        hintText('Draw from Brokerage first to cover expenses beyond your '),
        hintValue(fmtMon(ctx.ssMonthlyAmount)),
        hintText(
          ' Social Security. Long-term capital gains rates (0%, 15%, or 20%) keep your tax drag low while retirement accounts keep compounding.',
        ),
      ])
    }
    return hintJoin([
      hintText(
        'No Social Security configured — Brokerage becomes your primary income source. ',
      ),
      hintLink('Add Social Security →', { type: 'socialSecurity' }),
      hintText(
        ' Drawing here first preserves tax-advantaged growth in your other accounts.',
      ),
    ])
  },
}
