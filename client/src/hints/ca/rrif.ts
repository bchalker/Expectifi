import { hintJoin, hintText } from '../segments'
import { caRrspHint } from './rrsp'
import type { AccountHintDefinition } from '../types'

/** Used when user holds a RRIF — same pretax bucket as RRSP in portfolio rows. */
export const caRrifHint: AccountHintDefinition = {
  countries: ['CA'],
  taxTreatment: 'taxDeferred',
  growthHint: (ctx) => caRrspHint.growthHint(ctx),
  incomeHint: () =>
    hintJoin([
      hintText(
        'Mandatory minimum withdrawals apply. Plan draws to stay within lower bracket room. Excess can flow into TFSA if contribution room exists.',
      ),
    ]),
}
