import { hintJoin, hintText } from '../segments'
import type { AccountHintDefinition } from '../types'

export const usRothHint: AccountHintDefinition = {
  countries: ['US'],
  taxTreatment: 'taxFree',
  growthHint: () =>
    hintJoin([
      hintText(
        'Tax-free growth and withdrawals, no RMDs ever. Your most valuable tax-free asset, worth preserving as long as possible. ',
      ),
    ]),
  incomeHint: (ctx) => {
    if (ctx.userHasBrokerage) {
      return hintJoin([
        hintText(
          'Reserve Roth for lump-sum needs and large one-time expenses. Tax-free withdrawals do not affect Social Security provisional income calculations.',
        ),
      ])
    }
    return hintJoin([
      hintText(
        'Roth is your most flexible account — tax-free, no RMDs, no impact on SS provisional income. Draw here when Pre-tax withdrawals would push you into a higher bracket.',
      ),
    ])
  },
}
