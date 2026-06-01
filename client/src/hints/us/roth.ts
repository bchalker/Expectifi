import { hintJoin, hintLink, hintText } from '../segments'
import type { AccountHintDefinition } from '../types'

export const usRothHint: AccountHintDefinition = {
  countries: ['US'],
  taxTreatment: 'taxFree',
  growthHint: () =>
    hintJoin([
      hintText('Tax-free compounding with no RMDs. Every dollar of growth here is yours to keep. '),
      hintLink('Adjust scenario →', { type: 'scenario', bucket: 'roth', tab: 'outlook' }),
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
