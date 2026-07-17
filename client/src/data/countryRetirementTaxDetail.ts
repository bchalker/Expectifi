import type { RetirementTaxDetail } from './retirementTaxDetail'

const IRS = 'https://www.irs.gov/individuals/international-taxpayers'
const TREATY = 'https://www.irs.gov/businesses/international-businesses/united-states-income-tax-treaties-a-to-z'

function intl(
  partial: Omit<RetirementTaxDetail, 'usFederalApplies' | 'lastVerified' | 'localRateHeadline'> & {
    lastVerified?: string
    localRateHeadline?: string
  },
): RetirementTaxDetail {
  return {
    usFederalApplies: true,
    lastVerified: partial.lastVerified ?? '2025-01',
    ...partial,
    localRateHeadline: partial.localRateHeadline ?? partial.localRateLabel,
  }
}

function usOnlyLocal(
  headline: string,
  summary: string,
  note: string,
  opts?: { territorialSystem?: boolean },
): RetirementTaxDetail {
  return intl({
    localRateLabel: headline,
    localRateHeadline: headline,
    taxTreatyWithUS: false,
    foreignTaxCreditApplies: false,
    territorialSystem: opts?.territorialSystem ?? false,
    effectiveCombinedNote: note,
    retirementIncomeBreakdown: {
      socialSecurity: 'Taxable at US federal rate only',
      retirement401k: 'Taxable at US federal rate only',
      pension: 'Taxable at US federal rate only',
      investmentIncome: 'Taxable at US federal rate only',
    },
    plainLanguageSummary: summary,
    sourceUrl: IRS,
  })
}

function treatyCountry(
  localRateLabel: string,
  effectiveCombinedNote: string,
  breakdown: RetirementTaxDetail['retirementIncomeBreakdown'],
  plainLanguageSummary: string,
  opts?: { territorialSystem?: boolean; foreignTaxCreditApplies?: boolean },
): RetirementTaxDetail {
  return intl({
    localRateLabel,
    localRateHeadline: localRateLabel,
    taxTreatyWithUS: true,
    foreignTaxCreditApplies: opts?.foreignTaxCreditApplies ?? true,
    territorialSystem: opts?.territorialSystem ?? false,
    effectiveCombinedNote,
    retirementIncomeBreakdown: breakdown,
    plainLanguageSummary,
    sourceUrl: TREATY,
  })
}

export const COUNTRY_RETIREMENT_TAX_DETAIL: Record<string, RetirementTaxDetail> = {
  PT: treatyCountry(
    'Progressive local rates; NHR regime ended — ordinary rates often apply',
    'US-Portugal treaty and Foreign Tax Credit usually limit double taxation. Combined burden depends on residency status and income mix.',
    {
      socialSecurity: 'US federal applies; treaty may coordinate benefits',
      retirement401k: 'Typically taxable in Portugal when resident; FTC often offsets US federal',
      pension: 'Pension treatment varies by source; treaty article applies',
      investmentIncome: 'Generally taxable locally when resident; FTC may apply',
    },
    'Portugal no longer offers the old Non-Habitual Resident flat regime for new applicants in the same form. As a US citizen you still file US federal returns on worldwide income. The US-Portugal tax treaty and Foreign Tax Credit usually prevent paying full tax twice, but your exact burden depends on whether you are tax resident in Portugal and how each income type is classified.',
  ),
  ES: treatyCountry(
    'Progressive Spanish rates on worldwide income when tax resident',
    'Treaty and Foreign Tax Credit typically reduce double taxation. Effective combined rates often fall in a moderate band after credits.',
    {
      socialSecurity: 'US federal applies; treaty may affect cross-border treatment',
      retirement401k: 'Taxable in Spain when resident; FTC commonly offsets US federal',
      pension: 'Pension sourcing rules under treaty determine primary taxing right',
      investmentIncome: 'Generally taxable in Spain when resident',
    },
    'Spain taxes residents on worldwide income under progressive rates. US citizens remain liable for US federal tax, but the US-Spain treaty and Foreign Tax Credit usually prevent full double taxation. Regional rules and special regimes can change outcomes — verify current Beckham Law eligibility separately from this estimate.',
  ),
  IT: treatyCountry(
    'Progressive IRPEF (standard rates — Art. 24-ter only in confirmed eligible towns)',
    'Foreign Tax Credit typically offsets US federal tax on income already taxed in Italy. Double taxation is usually avoided under the US–Italy treaty.',
    {
      socialSecurity: 'Generally taxable in Italy under standard IRPEF when resident; FTC may offset US federal',
      retirement401k: 'Taxable in Italy under standard IRPEF when resident; FTC commonly offsets US federal',
      pension: 'Taxable under standard IRPEF unless the city qualifies for Art. 24-ter 7% (eligible towns ≤30k)',
      investmentIncome: 'Generally taxable in Italy when resident under progressive IRPEF (or Art. 24-ter when elected in an eligible town)',
    },
    'Most Expectifi Italy destinations are modeled under standard progressive IRPEF. Article 24-ter (7% substitute tax) applies only in confirmed eligible southern or earthquake-zone municipalities with ≤30,000 residents. IRPEF brackets are not sourced yet for non-eligible cities, so those displays use a temporary planning stub. As a US citizen you still file US federal returns; the US–Italy treaty and Foreign Tax Credit typically prevent full double taxation.',
  ),
  MX: treatyCountry(
    'Mexican resident rates on worldwide income (simplified ~10% planning rate)',
    'US-Mexico treaty and Foreign Tax Credit usually reduce double taxation after Mexican tax is paid.',
    {
      socialSecurity: 'US federal applies; treaty may coordinate',
      retirement401k: 'Taxable in Mexico when resident; FTC often offsets US federal',
      pension: 'Pension articles under treaty determine treatment',
      investmentIncome: 'Taxable locally when resident',
    },
    'Mexico generally taxes tax residents on worldwide income. US citizens still owe US federal tax, but the US-Mexico treaty and Foreign Tax Credit usually prevent paying the full amount twice. Residency after 183 days in a year is a common trigger for Mexican taxation.',
  ),
  CR: usOnlyLocal(
    '0% on foreign-sourced retirement income (territorial)',
    'Only US federal income tax applies. Costa Rica does not tax foreign-sourced retirement income.',
    'Costa Rica uses a territorial tax system: foreign-source pensions, Social Security, dividends, and capital gains are not taxed locally (0%). Locally-sourced Costa Rican income is taxed progressively — that is a different case from the foreign-source retirement income Expectifi models. As a US citizen you still owe US federal tax on worldwide income. There is no US-Costa Rica tax treaty.',
    { territorialSystem: true },
  ),
  PA: usOnlyLocal(
    'Foreign-sourced income typically not taxed locally',
    'Only US federal income tax applies on foreign-source retirement income for most retirees.',
    'Panama’s territorial system generally exempts foreign-sourced income from Panamanian tax. US citizens still owe US federal tax on worldwide income. There is no comprehensive US-Panama income tax treaty for FTC in the same way as major treaty countries, so planning focuses on US federal liability plus Panama-source income only.',
    { territorialSystem: true },
  ),
  TH: intl({
    localRateLabel: 'Thai tax on remitted foreign income when resident (simplified ~15% model)',
    localRateHeadline: 'Thai tax on remitted foreign income when resident (simplified ~15% model)',
    taxTreatyWithUS: true,
    foreignTaxCreditApplies: true,
    territorialSystem: false,
    effectiveCombinedNote:
      'Treaty and Foreign Tax Credit may reduce double taxation. Thai remittance rules make timing of income important.',
    retirementIncomeBreakdown: {
      socialSecurity: 'US federal applies; treaty may affect treatment',
      retirement401k: 'Taxable when remitted to Thailand while resident; FTC may offset US federal',
      pension: 'Remittance-based taxation possible when resident',
      investmentIncome: 'Often taxed when remitted while Thai tax resident',
    },
    plainLanguageSummary:
      'Thailand’s rules for foreign income remitted while resident are complex and have changed. US citizens still file US federal returns. The US-Thailand treaty and Foreign Tax Credit may reduce double taxation, but you should verify current remittance rules with a cross-border advisor.',
    sourceUrl: TREATY,
  }),
  GR: treatyCountry(
    '7% flat tax option on foreign pension income for qualifying retirees',
    'Treaty and Foreign Tax Credit usually prevent full double taxation for qualifying flat-tax electors.',
    {
      socialSecurity: 'US federal applies; treaty coordination',
      retirement401k: 'Flat-tax regime may apply to qualifying foreign pension income',
      pension: 'Often eligible for 7% flat rate when qualifying',
      investmentIncome: 'Other income may be taxed under ordinary Greek rules',
    },
    'Greece offers incentives for pensioners relocating from abroad, including a flat tax on foreign pension income for qualifying applicants. US federal tax still applies, but treaty relief and the Foreign Tax Credit usually offset much of the overlap.',
  ),
  FR: treatyCountry(
    'SS: progressive brackets (Art. 20); other income 0–45% by type',
    'US-France treaty and Foreign Tax Credit typically limit double taxation; outcome depends on income category.',
    {
      socialSecurity: 'Taxable by France under treaty Art. 20 — Expectifi applies 2026 progressive brackets',
      retirement401k: 'Private pensions / IRA–401(k) generally taxable by France under Art. 18 (range stub until pension type is modeled)',
      pension: 'US government pensions often reserved to US taxation under Art. 19 — product field needed to distinguish',
      investmentIncome: 'Generally taxable; prélèvements sociaux may apply on capital income on top of income tax',
    },
    'US Social Security is taxed by France under Art. 20 using 2026 progressive brackets. Other retirement income is 0–45% depending on amount and pension type; US government pensions may be reserved to US taxation (Art. 19). CSM (~6.5%) and prélèvements sociaux can apply on top and are not modeled. Non-SS surplus math uses a planning stub (FRANCE_PENSION_TYPE_FOLLOWUP) until government vs private pension is distinguished in the product.',
  ),
  DE: treatyCountry(
    'German progressive rates on worldwide income when resident',
    'Treaty and Foreign Tax Credit usually reduce combined US and German burden.',
    {
      socialSecurity: 'Treaty may affect cross-border social security',
      retirement401k: 'Taxable in Germany when resident; FTC commonly applies',
      pension: 'Pension sourcing under treaty determines taxing rights',
      investmentIncome: 'Taxable in Germany when resident',
    },
    'Germany taxes tax residents on worldwide income. US federal obligations continue, but the US-Germany treaty and Foreign Tax Credit typically prevent full double taxation.',
  ),
  NL: treatyCountry(
    '2026 Box 1 progressive rates — reduced first bracket from AOW age 67',
    'Treaty and Foreign Tax Credit usually offset much US federal tax after Dutch tax.',
    {
      socialSecurity: 'Treaty coordination may apply',
      retirement401k: 'Taxable in Netherlands when resident as Box 1 ordinary income',
      pension: 'Pension income taxed in full as Box 1 (not deferred/exempt)',
      investmentIncome: 'May fall under box 3 wealth tax concepts separately from income tax',
    },
    'The Netherlands taxes pension withdrawals as Box 1 ordinary income. Expectifi applies the 2026 brackets, the reduced first bracket from modeled age 67, and algemene heffingskorting (general tax credit). Arbeidskorting is intentionally excluded — it applies to employment income, not pension income for retirees. The uncommon pre-1946 threshold variant is not modeled. US citizens still file US federal returns; treaty relief and the Foreign Tax Credit usually reduce double taxation.',
  ),
  IE: treatyCountry(
    'Irish progressive rates on worldwide income when resident',
    'US-Ireland treaty and Foreign Tax Credit typically limit double taxation.',
    {
      socialSecurity: 'Treaty may coordinate benefits',
      retirement401k: 'Taxable in Ireland when resident; FTC often applies',
      pension: 'Pension articles under treaty apply',
      investmentIncome: 'Taxable when Irish tax resident',
    },
    'Ireland taxes residents on worldwide income. US federal tax still applies, but the US-Ireland treaty and Foreign Tax Credit usually prevent paying full rates in both countries.',
  ),
  GB: treatyCountry(
    'UK progressive rates on worldwide income when UK tax resident',
    'US-UK treaty and Foreign Tax Credit usually reduce double taxation.',
    {
      socialSecurity: 'Treaty may affect US Social Security taxation',
      retirement401k: 'Taxable in UK when resident; FTC commonly offsets US federal',
      pension: 'State and private pensions taxed under UK rules when resident',
      investmentIncome: 'Generally taxable in UK when resident',
    },
    'The United Kingdom taxes residents on worldwide income. US citizens still owe US federal tax, but the US-UK treaty and Foreign Tax Credit typically prevent full double taxation.',
  ),
  CA: treatyCountry(
    'Canadian federal + provincial tax on worldwide income when resident',
    'US-Canada treaty and Foreign Tax Credit usually prevent full double taxation.',
    {
      socialSecurity: 'Treaty may coordinate US Social Security',
      retirement401k: 'RRSP/401(k) treatment differs — often taxable in Canada when resident',
      pension: 'Pension income taxable under Canadian rules when resident',
      investmentIncome: 'Taxable in Canada when resident',
    },
    'Canada taxes residents on worldwide income including provincial surcharges. US federal tax still applies, but the US-Canada treaty and Foreign Tax Credit are among the most developed for preventing double taxation.',
  ),
  AU: treatyCountry(
    'Australian progressive rates on worldwide income when resident',
    'US-Australia treaty and Foreign Tax Credit usually limit double taxation.',
    {
      socialSecurity: 'US Social Security may be affected by treaty',
      retirement401k: 'Superannuation and US retirement accounts treated differently',
      pension: 'Foreign pensions taxable under Australian rules when resident',
      investmentIncome: 'Taxable in Australia when resident',
    },
    'Australia taxes residents on worldwide income. US citizens still file US returns, but treaty provisions and the Foreign Tax Credit usually reduce overlap. Superannuation rules differ from US 401(k) treatment.',
  ),
  NZ: treatyCountry(
    'New Zealand progressive rates on worldwide income when resident',
    'US-New Zealand treaty and Foreign Tax Credit typically reduce double taxation.',
    {
      socialSecurity: 'Treaty may coordinate benefits',
      retirement401k: 'Foreign superannuation and US accounts may be taxable when resident',
      pension: 'Foreign pensions generally taxable in NZ when resident',
      investmentIncome: 'Taxable when NZ tax resident',
    },
    'New Zealand taxes tax residents on worldwide income. US federal obligations continue, but treaty relief and the Foreign Tax Credit usually prevent paying full tax twice.',
  ),
  JP: treatyCountry(
    'Japanese national + local tax on worldwide income when resident',
    'US-Japan treaty and Foreign Tax Credit usually limit double taxation.',
    {
      socialSecurity: 'Treaty may coordinate social security',
      retirement401k: 'Taxable in Japan when resident; FTC often applies',
      pension: 'Pension articles under US-Japan treaty',
      investmentIncome: 'Taxable in Japan when resident',
    },
    'Japan taxes residents on worldwide income including local inhabitant taxes. US citizens still owe US federal tax, but the US-Japan treaty and Foreign Tax Credit typically prevent full double taxation.',
  ),
  CO: intl({
    localRateLabel: 'Colombian resident rates on worldwide income (simplified ~10%)',
    taxTreatyWithUS: false,
    foreignTaxCreditApplies: false,
    territorialSystem: false,
    effectiveCombinedNote:
      'Without a comprehensive US-Colombia income tax treaty, US federal tax and Colombian tax may both apply. Limited FTC relief for Colombian tax paid.',
    retirementIncomeBreakdown: {
      socialSecurity: 'US federal applies; limited treaty relief',
      retirement401k: 'Taxable in Colombia when resident; FTC may not fully offset US federal',
      pension: 'Taxable locally when resident',
      investmentIncome: 'Taxable in Colombia when resident',
    },
    plainLanguageSummary:
      'Colombia generally taxes tax residents on worldwide income. US citizens still owe US federal tax. There is no broad US-Colombia income tax treaty like with Europe, so Foreign Tax Credit relief for Colombian tax may be limited — plan for potential combined burden.',
    sourceUrl: IRS,
  }),
  EC: intl({
    localRateLabel: 'Low or zero local tax on foreign pensions (simplified model)',
    taxTreatyWithUS: false,
    foreignTaxCreditApplies: false,
    territorialSystem: false,
    effectiveCombinedNote:
      'US federal tax is the primary burden. Local tax on foreign retirement income is often minimal.',
    retirementIncomeBreakdown: {
      socialSecurity: 'Primarily US federal taxation',
      retirement401k: 'Often minimal Ecuador tax on foreign-source amounts',
      pension: 'Foreign pensions often lightly taxed locally',
      investmentIncome: 'Verify sourcing rules — US federal still applies',
    },
    plainLanguageSummary:
      'Ecuador is popular with retirees partly because local tax on foreign pensions can be low. US citizens still owe US federal tax on worldwide income. There is no US-Ecuador income tax treaty for broad FTC relief.',
    sourceUrl: IRS,
  }),
  VN: intl({
    localRateLabel: 'Vietnamese tax when tax resident after 183 days (simplified ~10%)',
    taxTreatyWithUS: false,
    foreignTaxCreditApplies: false,
    territorialSystem: false,
    effectiveCombinedNote:
      'US federal tax applies. Vietnamese tax may also apply when resident without treaty FTC relief.',
    retirementIncomeBreakdown: {
      socialSecurity: 'US federal applies',
      retirement401k: 'Taxable in Vietnam when resident',
      pension: 'Taxable locally when resident',
      investmentIncome: 'Taxable when Vietnamese tax resident',
    },
    plainLanguageSummary:
      'Vietnam may tax worldwide income after you become tax resident. US federal tax still applies. There is no US-Vietnam income tax treaty, so Foreign Tax Credit relief for Vietnamese tax is generally unavailable.',
    sourceUrl: IRS,
  }),
  PH: treatyCountry(
    'Philippine progressive rates on Philippine-source and resident income',
    'US-Philippines treaty and Foreign Tax Credit may reduce double taxation.',
    {
      socialSecurity: 'Treaty may coordinate benefits',
      retirement401k: 'Taxable in Philippines when resident; FTC may offset US federal',
      pension: 'Pension treatment under treaty',
      investmentIncome: 'Taxable when Philippine tax resident',
    },
    'The Philippines taxes residents on income from all sources. US federal tax still applies, but the US-Philippines treaty and Foreign Tax Credit may reduce double taxation.',
  ),
  MY: intl({
    localRateLabel: 'Malaysian tax on Malaysian-source income; foreign income often exempt until remitted',
    taxTreatyWithUS: false,
    foreignTaxCreditApplies: false,
    territorialSystem: false,
    effectiveCombinedNote:
      'US federal tax applies. Malaysian treatment of foreign retirement income varies — verify MM2H and residency rules.',
    retirementIncomeBreakdown: {
      socialSecurity: 'US federal applies',
      retirement401k: 'Verify remittance and residency — US federal applies',
      pension: 'Foreign pension treatment varies by residency status',
      investmentIncome: 'May be exempt until remitted — confirm current law',
    },
    plainLanguageSummary:
      'Malaysia’s treatment of foreign-source income depends on residency and remittance rules. US citizens always owe US federal tax. There is no broad US-Malaysia treaty for FTC in the same way as with treaty partners in Europe.',
    sourceUrl: IRS,
  }),
  UY: intl({
    localRateLabel: 'Temporary tax holiday on foreign income for new tax residents (limited years)',
    taxTreatyWithUS: false,
    foreignTaxCreditApplies: false,
    territorialSystem: false,
    effectiveCombinedNote:
      'During qualifying holiday years local tax on foreign income may be low; US federal always applies.',
    retirementIncomeBreakdown: {
      socialSecurity: 'US federal applies',
      retirement401k: 'May qualify for Uruguayan tax holiday when new resident',
      pension: 'Holiday may apply to foreign pensions for qualifying period',
      investmentIncome: 'Verify holiday eligibility annually',
    },
    plainLanguageSummary:
      'Uruguay has offered tax incentives for new residents on foreign-source income for a limited period. US federal tax still applies on worldwide income. Foreign Tax Credit for Uruguayan tax is generally not available without a treaty.',
    sourceUrl: IRS,
  }),
  CL: treatyCountry(
    'Chilean progressive rates on worldwide income when resident',
    'US-Chile treaty and Foreign Tax Credit may reduce double taxation.',
    {
      socialSecurity: 'Treaty may coordinate',
      retirement401k: 'Taxable in Chile when resident; FTC may offset US federal',
      pension: 'Pension articles under treaty',
      investmentIncome: 'Taxable when Chilean tax resident',
    },
    'Chile taxes tax residents on worldwide income. US citizens still file US federal returns, but the US-Chile treaty and Foreign Tax Credit may limit double taxation.',
  ),
}
