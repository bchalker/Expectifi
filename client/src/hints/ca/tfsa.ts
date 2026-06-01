import { hintJoin, hintLink, hintText } from '../segments'
import type { AccountHintDefinition } from '../types'

export const caTfsaHint: AccountHintDefinition = {
  countries: ['CA'],
  taxTreatment: 'taxFree',
  growthHint: () =>
    hintJoin([
      hintText('Tax-free compounding with no impact on benefit clawbacks. '),
      hintLink('Adjust scenario →', { type: 'scenario', bucket: 'roth', tab: 'outlook' }),
    ]),
  incomeHint: () =>
    hintJoin([
      hintText(
        'Tax-free withdrawals at any time with no impact on CPP/OAS clawback thresholds. Use for lump-sum needs or to top up income without affecting government benefit calculations.',
      ),
    ]),
}
