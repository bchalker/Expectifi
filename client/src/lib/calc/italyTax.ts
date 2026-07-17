/**
 * Italy personal income tax (IRPEF) — catalog destinations.
 *
 * ---------------------------------------------------------------------------
 * ITALY_STANDARD_BRACKETS_FOLLOWUP (blocked on research, not product)
 * ---------------------------------------------------------------------------
 * Standard IRPEF bracket tables have not been sourced in this project yet.
 * Do not invent intermediate brackets or claim a calculated effective rate.
 * Non–Art. 24-ter catalog cities use {@link IT_UNSOURCED_EFFECTIVE_STUB} only.
 *
 * Art. 24-ter eligibility (7% substitute tax on foreign-source income):
 * - Municipality in Sicily, Calabria, Sardinia, Campania, Basilicata, Abruzzo,
 *   Molise, or Puglia — or a designated earthquake-reconstruction town in
 *   Lazio / Marche / Umbria
 * - Population ≤ 30,000 (Law 34/2026)
 * - Qualifying foreign pension + not Italian tax resident in the prior 5 years
 *
 * Most catalog Italy cities fail that test (wrong region or far above 30k).
 * Confirmed eligible catalog towns are listed in
 * {@link IT_ART_24_TER_ELIGIBLE_CITIES} and use {@link IT_ART_24_TER_RATE}.
 *
 * Educational planning estimate only — not tax advice.
 */

/**
 * Temporary planning stub until IRPEF brackets are sourced.
 * Same neutral fallback used for unknown progressive countries — not a
 * bracket-derived effective rate. Replace when the official table lands.
 */
export const IT_UNSOURCED_EFFECTIVE_STUB = 0.2

/** Art. 24-ter substitute tax — only for confirmed eligible catalog towns. */
export const IT_ART_24_TER_RATE = 0.07

/**
 * Catalog cities confirmed eligible for Art. 24-ter (region + ≤30k population).
 * Keys match `RetirementCityRecord.city` / CSV `city` exactly.
 */
export const IT_ART_24_TER_ELIGIBLE_CITIES = new Set(['San Giovanni Rotondo'])

export function isItalyArt24TerEligibleCity(city?: string | null): boolean {
  const trimmed = city?.trim()
  if (!trimmed) return false
  return IT_ART_24_TER_ELIGIBLE_CITIES.has(trimmed)
}

/** Effective local rate for an Italy catalog city (Art. 24-ter or IRPEF stub). */
export function resolveItalyEffectiveTaxRate(city?: string | null): number {
  return isItalyArt24TerEligibleCity(city)
    ? IT_ART_24_TER_RATE
    : IT_UNSOURCED_EFFECTIVE_STUB
}

export const ITALY_STANDARD_BRACKETS_FOLLOWUP =
  'Italy’s standard IRPEF bracket table still needs sourcing before progressive tax can fully ship (same gate as Portugal/Netherlands before their tables landed). Only confirmed Art. 24-ter towns may use the 7% rate.'

export const ITALY_TAX_DISCLOSURE_SHORT =
  'Most catalog Italy cities use standard progressive IRPEF — not the 7% Art. 24-ter regime. Bracket table not sourced yet; rate shown is a temporary planning stub.'

export const ITALY_TAX_DISCLOSURE_LONG =
  'Most Expectifi Italy destinations are taxed under standard progressive IRPEF — not Article 24-ter. The 7% substitute tax requires an eligible southern or earthquake-zone municipality with ≤30,000 residents plus a qualifying foreign pension. The IRPEF bracket table has not been sourced yet, so non-eligible cities use a temporary planning stub — not a bracket calculation. US citizens still file US returns; the US–Italy treaty and Foreign Tax Credit usually prevent full double taxation. Not tax advice.'

export const ITALY_ART_24_TER_DISCLOSURE_SHORT =
  'This town qualifies for Italy’s Art. 24-ter 7% substitute tax on foreign-source income (eligible Puglia comune ≤30k). Requires a qualifying foreign pension — not tax advice.'

export const ITALY_ART_24_TER_DISCLOSURE_LONG =
  'San Giovanni Rotondo (Puglia, population under 30,000) is modeled under Article 24-ter: a 7% substitute tax on foreign-source income for up to 10 years for qualifying foreign pensioners who were not Italian tax residents in the prior 5 years. US citizens still file US returns; the US–Italy treaty and Foreign Tax Credit usually prevent full double taxation. Not tax advice.'

/** COL tab — Numbeo contributor thinness for San Giovanni Rotondo. */
export const SAN_GIOVANNI_ROTONDO_COL_CONFIDENCE_NOTE =
  'Cost data from Numbeo (April 2026) with only 5 contributors — less precise than major-city catalog entries. Some basket items are unavailable (e.g. monthly transport pass) and are left blank, not estimated.'

export const ITALY_ART_24_TER_TAX_RATE_LABEL = '7% flat tax (Art. 24-ter)'

export const ITALY_ART_24_TER_TAX_SUMMARY =
  "San Giovanni Rotondo qualifies for Italy's Article 24-ter: a flat 7% substitute tax on foreign-source income for up to 10 years. Puglia comune with population under 30,000 (Law 34/2026). Must receive a qualifying foreign pension and must not have been Italian tax resident in the prior 5 years. US-Italy tax treaty in place."

export const ITALY_ART_24_TER_KEY_EXEMPTIONS =
  '7% flat tax on foreign-source income for up to 10 years after electing as a foreign pensioner. This comune meets the southern-region and ≤30,000-resident tests under Law 34/2026.'

export const ITALY_ART_24_TER_TOP_REASON =
  '7% Art. 24-ter flat tax — eligible Puglia town under 30k residents'
