import { fmtMon } from '../../utils/format'
import { hintJoin, hintLink, hintText, hintValue } from '../segments'
import type { AccountHintDefinition } from '../types'

export const usHsaHint: AccountHintDefinition = {
  countries: ['US'],
  taxTreatment: 'medical',
  growthHint: () =>
    hintJoin([
      hintText(
        'Medical withdrawals are always tax-free. After 65, non-medical withdrawals are taxed like a traditional IRA, making this a stealth retirement account. ',
      ),
    ]),
  incomeHint: (ctx) => {
    if (ctx.hasMedicalExpensesConfigured && ctx.projectedMedicalMonthly > 0) {
      const segments = hintJoin([
        hintText('Use HSA first for all qualified medical expenses. At '),
        hintValue(fmtMon(ctx.projectedMedicalMonthly)),
        hintText(' projected medical costs, paying out of pocket wastes this tax-free advantage.'),
      ])
      if (!ctx.hasSSConfigured) {
        return hintJoin([
          ...segments,
          hintText(' '),
          hintLink('Add Social Security →', { type: 'socialSecurity' }),
          hintText(' if not yet configured.'),
        ])
      }
      return segments
    }
    return hintJoin([
      hintText(
        'No medical expenses configured yet. HSA withdrawals are tax-free for qualified medical costs — the most tax-efficient account you have for healthcare.',
      ),
    ])
  },
}
