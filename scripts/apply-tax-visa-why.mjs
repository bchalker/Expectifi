/**
 * Merges *_why narrative fields into retirement-tax-visa.json.
 * Hand-crafted overrides for priority countries; warm template fallbacks for the rest.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const JSON_PATH = path.join(__dirname, '../client/src/data/retirement-tax-visa.json')

/** @type {Record<string, Partial<Record<string, string>>>} */
const WHY_OVERRIDES = {
  Spain: {
    tax_rate_why:
      "There's no special pension deal here — your foreign pension faces normal Spanish progressive rates. Budget for that, and lean on the US–Spain treaty and Foreign Tax Credit to avoid double taxation.",
    tax_summary_why:
      'The Golden Visa is gone, so the Non-Lucrative Visa is the main retiree path — passive income proof and annual renewals are part of the real cost of settling in.',
    key_exemptions_why:
      'No flat-rate pension exemption means your visa income threshold (~€28,800/year) is the gate — plan for that before you pick a neighborhood.',
    healthcare_notes_why:
      "You'll need private insurance to apply, then Spain's public system becomes excellent once you're registered as a resident.",
    visa_summary_why:
      'Five years to permanent residency is a clear runway if you want EU roots without a work visa.',
  },
  Colombia: {
    tax_rate_why:
      'Stay under 183 days in any 365-day window and Colombia generally taxes only local income — cross that line and worldwide income can hit progressive rates up to 39%.',
    tax_summary_why:
      "Many expats deliberately manage their calendar because residency timing is the whole game — there's no US–Colombia treaty to fall back on.",
    key_exemptions_why:
      'Without a treaty, your US filing continues as usual — local non-resident status is what keeps foreign pensions off the Colombian return.',
    healthcare_notes_why:
      "Medellín and Bogotá offer excellent private care at a fraction of US prices — budget insurance from day one since Medicare won't travel with you.",
    visa_summary_why:
      'At roughly $750/month, the pensioner visa is one of the most reachable in Latin America if Medellín\'s spring climate fits your plan.',
    panel_heads_up:
      "As a US citizen, you still file with the IRS on worldwide income. Colombia has no US tax treaty — your 183-day count determines whether local tax applies to foreign income. Map both sides with a cross-border advisor before you commit.",
  },
  Italy: {
    tax_rate_why:
      'The 7% flat regime is real savings — but only in qualifying southern towns under Article 24-ter, not anywhere in Italy you fancy.',
    tax_summary_why:
      'You trade location flexibility for a decade of predictable tax on foreign income — worth it if a small southern comune fits your lifestyle.',
    key_exemptions_why:
      'Standard rates up to 43% apply outside the special regime — confirm your municipality qualifies before you sign a lease.',
    healthcare_notes_why:
      'Private insurance gets you through the visa phase; SSN public care is excellent once you\'re registered.',
    visa_summary_why:
      'Elective Residency works for passive-income retirees — bureaucracy is the main friction, not the income threshold.',
  },
  Greece: {
    tax_rate_why:
      'Article 5B\'s 7% flat rate on foreign income for up to 15 years is among Europe\'s best deals — if you meet the investment and relocation rules.',
    tax_summary_why:
      'The flat election is optional but powerful — compare it against standard progressive rates before you declare residency.',
    key_exemptions_why:
      'The €250,000 property tie-in is non-negotiable for the special regime — factor that into your upfront capital plan.',
    healthcare_notes_why:
      'Public care opens after residency; private insurance is required to get your visa in the first place.',
    visa_summary_why:
      'The Financially Independent Person route suits retirees with steady passive income who want island or mainland Mediterranean life.',
  },
  France: {
    tax_rate_why:
      'The US–France treaty can exempt US retirement account distributions from French tax once you\'re resident — that\'s a meaningful break if your income is mostly 401(k) or IRA draws.',
    tax_summary_why:
      'French tax is complex, but pension and Social Security treatment under the treaty often surprises retirees in a good way — get it mapped professionally.',
    key_exemptions_why:
      'Roth and investment income follow different rules than traditional pensions — don\'t assume one exemption covers everything.',
    healthcare_notes_why:
      'Sécurité Sociale is world-class once you\'re in the system — plan for private cover during the first months of legal residence.',
    visa_summary_why:
      'The Long Stay Visitor visa is the classic retiree path — prove sufficient passive income and you can live in France year-round.',
  },
  Panama: {
    tax_rate_why:
      'Territorial taxation means US pensions and Social Security typically stay off the Panamanian return — one of the clearest tax wins in the Americas.',
    tax_summary_why:
      'Only Panama-source income is taxed locally, so most retirees living on US retirement income keep the full territorial benefit.',
    key_exemptions_why:
      'No US–Panama treaty, but territorial rules often make that irrelevant for pension-only income — still confirm your specific sources.',
    healthcare_notes_why:
      'Panama City has JCI-accredited hospitals at reasonable cost — insurance is essential since Medicare doesn\'t apply abroad.',
    visa_summary_why:
      'The Pensionado visa grants immediate permanent residency plus retiree discounts — one of the smoothest paths in Central America.',
  },
  'Costa Rica': {
    tax_rate_why:
      'Costa Rica taxes only local-source income, so US pensions and Social Security usually stay completely off the CR return.',
    tax_summary_why:
      'Territorial rules are straightforward for typical retirees — your main job is proving pension income for the visa, not fighting local tax on foreign income.',
    key_exemptions_why:
      'Foreign investment and pension income are exempt — employment or Costa Rican business income is what triggers local tax.',
    healthcare_notes_why:
      'CAJA public healthcare after residency is excellent value; many expats use private care for speed and keep CAJA as backup.',
    visa_summary_why:
      '$1,000/month lifetime pension qualifies you for Pensionado — permanent residency in three years if you stay the course.',
  },
  Ecuador: {
    tax_rate_why:
      'Territorial rules and senior discounts can leave foreign pension income lightly taxed or exempt — the dollar economy removes currency risk from your budget.',
    tax_summary_why:
      'Cuenca and Quito expats often live entirely on US pensions with minimal local tax friction — verify your income sources still qualify.',
    key_exemptions_why:
      'Senior discounts on utilities and services add up — they\'re separate from tax but part of why Ecuador pencils out for retirees.',
    healthcare_notes_why:
      'Private care in Quito and Cuenca is excellent and cheap; IESS public cover is an option once you\'re in the system.',
    visa_summary_why:
      'The pensioner visa is accessible and Cuenca\'s expat infrastructure is mature — good for a soft landing in the Andes.',
  },
  Philippines: {
    tax_rate_why:
      'SRRV holders often pay no Philippine tax on pension income — that\'s a major reason retirees choose the archipelago over other Southeast Asian options.',
    tax_summary_why:
      'Territorial treatment plus SRRV exemptions mean US Social Security and pensions frequently stay off the local return.',
    key_exemptions_why:
      'The SRRV deposit and pension proof are the gate — tax benefits follow visa status, not the other way around.',
    healthcare_notes_why:
      'English-speaking doctors and good Manila/Cebu hospitals make care accessible — private insurance is still essential.',
    visa_summary_why:
      'Age 50+ with $1,500/month pension plus a deposit gets you permanent residence — one of the clearest retirement visa formulas in Asia.',
  },
  Malaysia: {
    tax_rate_why:
      'Malaysia exempts foreign-source income for residents — US pensions and Social Security typically stay off the Malaysian return.',
    tax_summary_why:
      'Territorial treatment is why MM2H retirees often pay zero local tax on US retirement income — only Malaysian-source income is in scope.',
    key_exemptions_why:
      'Remittance rules matter for some income types — pensions paid directly from the US usually stay exempt without extra steps.',
    healthcare_notes_why:
      'KL and Penang have international-standard hospitals — insurance is required for MM2H and sensible for any retiree.',
    visa_summary_why:
      'MM2H tiers (Silver/Gold/Platinum) set income and deposit bars — pick the tier that matches your budget before you shop for condos.',
  },
  Cyprus: {
    tax_rate_why:
      'The 5% flat option on foreign pensions above €3,420/year is one of the EU\'s best retiree rates — if you elect it and qualify.',
    tax_summary_why:
      'You can choose the 5% pension rate or standard progressive tax — the election is worth modeling before you become tax resident.',
    key_exemptions_why:
      'Territorial aspects for non-domiciled residents add another layer — professional advice pays for itself quickly here.',
    healthcare_notes_why:
      'English-speaking care and EU standards make Cyprus easy for US retirees once private insurance gets you through the visa gate.',
    visa_summary_why:
      'Category F suits passive-income retirees who want EU access with Mediterranean weather and a low pension tax option.',
  },
  Malta: {
    tax_rate_why:
      'The Global Residence Programme\'s 15% flat tax on remitted foreign income is predictable — with a minimum annual tax that sets a floor on what you\'ll pay.',
    tax_summary_why:
      'Income you don\'t remit to Malta often stays untaxed locally — structure matters if you have investments outside the country.',
    key_exemptions_why:
      'The €15,000 minimum annual tax means ultra-low-income retirees still pay something — factor that into your budget.',
    healthcare_notes_why:
      'English-speaking doctors and EU-standard care make Malta comfortable for US retirees once you\'re insured and registered.',
    visa_summary_why:
      'Property purchase or rental plus the GRP application is the standard path — EU residency is the payoff for the paperwork.',
  },
  Georgia: {
    tax_rate_why:
      'Georgia\'s territorial system means foreign pensions and Social Security usually stay off the local return — plus US citizens get a year visa-free.',
    tax_summary_why:
      'Only Georgian-source income is taxed — most retirees living on US income keep the full territorial benefit without a special visa.',
    key_exemptions_why:
      'The 365-day visa-free stay is unusual — many retirees cycle residency without a formal retirement program at all.',
    healthcare_notes_why:
      'Private care in Tbilisi is affordable and improving — insurance is cheap compared to US plans.',
    visa_summary_why:
      'No formal retirement visa needed for many Americans — the low cost of living and territorial tax are the main draws.',
  },
  Uruguay: {
    tax_rate_why:
      'New tax residents get a 10-year exemption on foreign-source income — a long runway before standard rates apply.',
    tax_summary_why:
      'The decade exemption is the headline — after year ten, foreign income faces a 12% rate, so plan the long arc not just year one.',
    key_exemptions_why:
      'The tax holiday applies to new residents who qualify — confirm your residency start date and reporting obligations.',
    healthcare_notes_why:
      'Montevideo private hospitals are international-standard — public and private options both work for retirees.',
    visa_summary_why:
      'Rentista visa suits passive-income retirees who want stability, mild climate, and a clear path to permanent residency.',
  },
  UAE: {
    tax_rate_why:
      'Zero personal income tax means your US pension stays untaxed locally — but Dubai and Abu Dhabi living costs are the real budget line item.',
    tax_summary_why:
      'No local tax on retirement income is genuine — residency via the retirement visa still requires proving financial means.',
    key_exemptions_why:
      'No US–UAE treaty, but with zero local tax the main question is US filing and FTC, not double taxation locally.',
    healthcare_notes_why:
      'World-class private hospitals — comprehensive insurance is mandatory and expensive by regional standards.',
    visa_summary_why:
      'The retirement visa at 55+ requires financial proof — this is a high-cost, low-tax lifestyle choice, not a budget destination.',
  },
  'United States': {
    tax_rate_why:
      'Staying home means federal tax on retirement account draws and up to 85% of Social Security — state choice matters enormously for your net income.',
    tax_summary_why:
      'Nine states skip income tax entirely — if you\'re flexible on location, that\'s often the biggest tax lever you have without leaving the country.',
    key_exemptions_why:
      'State SS exemptions and property tax rules vary wildly — your city pick affects the bill as much as your portfolio.',
    healthcare_notes_why:
      'Medicare at 65 is the anchor — Medigap or Advantage fills the gaps; budget both premiums and out-of-pocket before you retire.',
    visa_summary_why:
      'No immigration friction — full access to SS, Medicare, and familiar systems is the tradeoff for US tax rates.',
  },
  Canada: {
    tax_rate_why:
      'Canada taxes residents on worldwide income — the US–Canada treaty coordinates pensions and Social Security so you\'re not blindly double-taxed.',
    tax_summary_why:
      'Provincial rates stack on federal — your province pick affects the total as much as the national brackets.',
    key_exemptions_why:
      'The treaty is comprehensive but doesn\'t eliminate US filing — Foreign Tax Credit and treaty articles need professional mapping.',
    healthcare_notes_why:
      'Provincial universal care is excellent once you\'re a legal resident — wait periods vary by province.',
    visa_summary_why:
      'No dedicated retirement visa — Super Visa works for family ties; most US retirees need another pathway to live full-time.',
  },
  'United Kingdom': {
    tax_rate_why:
      'US pensions are taxable in the UK as foreign pension income — the treaty governs how, not whether, you\'ll report them.',
    tax_summary_why:
      'National Insurance and income tax stack on pension income — budget for both, not just the headline rate.',
    key_exemptions_why:
      'Treaty Article 17 and Form 1116 FTC usually coordinate the US and UK sides — don\'t assume exemption without advice.',
    healthcare_notes_why:
      'NHS access for legal residents is excellent — private cover speeds elective care while you establish residency.',
    visa_summary_why:
      'No retirement visa for Americans — ancestry, wealth, or family routes are the realistic paths for long stays.',
  },
  Australia: {
    tax_rate_why:
      'Australia taxes residents on worldwide income up to 45% plus Medicare levy — the US–Australia treaty helps but doesn\'t replace US filing.',
    tax_summary_why:
      'Dedicated retirement visas are effectively closed — immigration pathways are the bigger hurdle than the rate on the label.',
    key_exemptions_why:
      'Four-year transitional resident rules may apply to some new arrivals — worth checking if you\'re planning a recent move.',
    healthcare_notes_why:
      'Medicare for permanent residents is excellent — private insurance bridges the gap during waiting periods.',
    visa_summary_why:
      'Subclass 405/410 retirement visas aren\'t open to new applicants — explore investor or family routes if Australia is the goal.',
  },
  Israel: {
    tax_rate_why:
      'New immigrants and returning residents get a 10-year exemption on foreign income — one of the strongest tax holidays for eligible movers.',
    tax_summary_why:
      'The Olim exemption is real but eligibility-specific — it\'s not available to every retiree who simply wants to relocate.',
    key_exemptions_why:
      'Law of Return and Aliyah status gate the tax benefits — confirm eligibility before counting on the 10-year window.',
    healthcare_notes_why:
      'Kupot holim health funds deliver excellent universal care once you\'re enrolled — mandatory enrollment for residents.',
    visa_summary_why:
      'Law of Return provides a unique path for eligible Jewish immigrants and family — unlike any standard retirement visa elsewhere.',
  },
  Dominican: null, // placeholder avoid
}

// Remove bad key
delete WHY_OVERRIDES.Dominican

function hasTerritorial(c) {
  const t = `${c.tax_rate_label} ${c.tax_summary} ${c.key_exemptions}`.toLowerCase()
  return t.includes('territorial') || t.includes('foreign income not taxed') || t.includes('foreign-source income')
}

function hasNonResident183(c) {
  const t = `${c.tax_rate_label} ${c.tax_summary} ${c.key_exemptions}`.toLowerCase()
  return t.includes('183') || t.includes('non-resident')
}

function hasFlatRate(c) {
  return /\d+% flat/.test(c.tax_rate_label.toLowerCase()) || c.tax_rate_label.toLowerCase().includes('flat tax')
}

function hasNoIncomeTax(c) {
  const t = c.tax_rate_label.toLowerCase()
  return t.includes('no income tax') || t.includes('no personal income tax') || t === 'no income tax'
}

function fallbackWhy(name, c) {
  const treaty = c.us_tax_treaty
  const treatyNote = treaty
    ? 'The US tax treaty and Foreign Tax Credit usually keep you from paying twice on the same income.'
    : "There's no US tax treaty — your US filing continues as usual, and local rules determine what gets taxed here."

  let tax_rate_why
  if (hasNoIncomeTax(c)) {
    tax_rate_why =
      "Zero local income tax is real — but residency pathways, insurance, and living costs still need to work on your budget."
  } else if (hasTerritorial(c)) {
    tax_rate_why =
      'Territorial taxation often keeps US pensions off the local return — but what you remit and your residency status still shape the bill.'
  } else if (hasNonResident183(c)) {
    tax_rate_why =
      'Days spent in-country and whether you\'re treated as resident often matter more than the headline rate — track your calendar carefully.'
  } else if (hasFlatRate(c)) {
    tax_rate_why = `The flat rate on the label is predictable for budgeting — ${treatyNote}`
  } else {
    tax_rate_why = `Progressive rates apply to your income here — ${treatyNote}`
  }

  const tax_summary_why = hasTerritorial(c)
    ? 'Most retirees living on US pensions and Social Security focus on visa proof and residency days — local tax on foreign income is often minimal if you structure correctly.'
    : hasNonResident183(c)
      ? 'Crossing the residency threshold can switch you from local-only taxation to worldwide income — plan your stays before you sign a long lease.'
      : 'Your specific income mix (pension, investments, part-time work) determines the practical bill — the summary above is the starting point, not your personal rate.'

  const key_exemptions_why = c.key_exemptions.toLowerCase().includes('foreign tax credit')
    ? 'Foreign Tax Credit on your US return is usually the backstop — local exemptions define what you owe here first.'
    : 'The exemptions above are what separate a favorable setup from a costly one — verify they apply to your income sources.'

  const healthcare_notes_why =
    c.healthcare_notes.toLowerCase().includes('private insurance required') ||
    c.healthcare_notes.toLowerCase().includes('private insurance recommended')
      ? "You'll likely need private insurance to get the visa and for day-to-day care — Medicare doesn't cover you abroad."
      : 'Healthcare quality varies by city — private insurance is still the safe default for US retirees overseas.'

  const visa_summary_why = c.retirement_visa_available
    ? 'A formal retirement or passive-income visa path exists — income proof and insurance are usually the main hurdles.'
    : 'No dedicated retirement visa — explore passive-income, investor, or long-stay routes that match your situation.'

  return {
    tax_rate_why,
    tax_summary_why,
    key_exemptions_why,
    healthcare_notes_why,
    visa_summary_why,
  }
}

const raw = fs.readFileSync(JSON_PATH, 'utf8')
const data = JSON.parse(raw)

let overridden = 0
let generated = 0
let skipped = 0

for (const [name, country] of Object.entries(data.countries)) {
  if (country.tax_rate_why) {
    skipped++
    continue
  }

  const override = WHY_OVERRIDES[name]
  const why = override ?? fallbackWhy(name, country)

  for (const [key, value] of Object.entries(why)) {
    if (value) country[key] = value
  }

  if (override) overridden++
  else generated++
}

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n')
console.log(`Done: ${overridden} hand-crafted, ${generated} generated, ${skipped} already had why fields`)
