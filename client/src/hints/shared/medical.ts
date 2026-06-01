import { hintJoin, hintLink, hintText } from '../segments'
import type { AccountHintDefinition } from '../types'

export const sharedMedicalHint: AccountHintDefinition = {
  countries: ['*'],
  taxTreatment: 'medical',
  growthHint: (ctx) =>
    hintJoin([
      hintText('Tax-free growth reserved for medical expenses. '),
      hintLink('Set growth rate →', { type: 'scenario', bucket: ctx.accountType, tab: 'custom' }),
    ]),
  incomeHint: () => hintJoin([hintText('Use for all qualified medical expenses first.')]),
}
