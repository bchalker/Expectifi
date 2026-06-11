#!/usr/bin/env node
/**
 * Populate structured residency ease fields on retirement-tax-visa.json entries.
 * Run: node scripts/populate-residency-ease-fields.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const jsonPath = path.join(__dirname, '../client/src/data/retirement-tax-visa.json')

const RETIREMENT_VISA_COUNTRIES = new Set([
  'Panama', 'Costa Rica', 'Philippines', 'Thailand', 'Malaysia', 'Ecuador',
  'Dominican Republic', 'Nicaragua', 'Belize', 'Italy', 'Greece', 'Cyprus',
  'Malta', 'Portugal', 'Spain', 'Croatia', 'Indonesia', 'Bahrain',
  'United Arab Emirates', 'South Africa', 'New Zealand', 'Sri Lanka', 'Fiji',
])

const ENGLISH_FRIENDLY_VISA = new Set([
  'United States', 'United Kingdom', 'Canada', 'Australia', 'New Zealand', 'Ireland',
  'Philippines', 'Singapore', 'Malta', 'Belize', 'Barbados', 'Jamaica', 'Bahamas',
  'Panama', 'Costa Rica', 'Mexico', 'Ecuador', 'Colombia', 'Malaysia', 'Bahrain',
  'United Arab Emirates', 'South Africa', 'India', 'Kenya', 'Fiji', 'Sri Lanka',
])

const RETIREMENT_VISA_NAME = /retirement|passive income|d7|pension|nlv|non-lucrative|mm2h|rentista|pensionado|financially independent|silver hair|special resident/i

function parseMinIncomeUsd(text) {
  if (!text || typeof text !== 'string') return 30000
  const lower = text.toLowerCase()
  const amounts = [...text.matchAll(/\$\s*([\d,]+(?:\.\d+)?)/g)].map((m) =>
    parseFloat(m[1].replace(/,/g, '')),
  )
  if (!amounts.length) return 30000

  if (lower.includes('/month') || lower.includes('month') || lower.includes('mo')) {
    return Math.round(amounts[0] * 12)
  }
  if (lower.includes('/year') || lower.includes('year') || lower.includes('annual')) {
    return Math.round(amounts[0])
  }
  if (amounts[0] <= 5000) return Math.round(amounts[0] * 12)
  return Math.round(amounts[0])
}

function parseYearsToPermanent(summary, visaName) {
  const combined = `${summary} ${visaName}`
  const match =
    combined.match(/permanent residen(?:cy|ce) after (\d+) years/i) ??
    combined.match(/(?:leads to|path to) permanent residen(?:cy|ce).*?(\d+) years/i)
  if (match) return parseInt(match[1], 10)
  if (/after 5 years.*citizenship|5 years.*permanent|permanent.*5 years/i.test(combined)) return 5
  if (/10.year card|10 years/i.test(combined)) return 10
  return 10
}

function inferRetirementVisa(country, entry) {
  if (RETIREMENT_VISA_COUNTRIES.has(country)) return true
  return RETIREMENT_VISA_NAME.test(entry.visa_name ?? '')
}

function inferEnglishFriendly(country) {
  return ENGLISH_FRIENDLY_VISA.has(country)
}

const raw = fs.readFileSync(jsonPath, 'utf8')
const data = JSON.parse(raw)

for (const [country, entry] of Object.entries(data.countries)) {
  entry.retirement_visa_available = inferRetirementVisa(country, entry)
  entry.residency_years_to_permanent = parseYearsToPermanent(
    entry.visa_summary ?? '',
    entry.visa_name ?? '',
  )
  entry.min_income_required_usd = parseMinIncomeUsd(entry.visa_income_requirement ?? '')
  entry.english_friendly_process = inferEnglishFriendly(country)
}

fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`)
console.log(`Updated ${Object.keys(data.countries).length} countries in retirement-tax-visa.json`)
