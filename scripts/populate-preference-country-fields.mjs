#!/usr/bin/env node
/**
 * Populate preference scoring fields on retirement-tax-visa.json entries.
 * Run: node scripts/populate-preference-country-fields.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const jsonPath = path.join(__dirname, '../client/src/data/retirement-tax-visa.json')

const STRICT_SOCIAL = new Set([
  'Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Iran', 'Pakistan',
])
const ALCOHOL_RESTRICTED = new Set([
  'Saudi Arabia', 'Kuwait', 'Iran', 'Pakistan', 'Bangladesh',
])
const DRESS_CODE = new Set(['Saudi Arabia', 'Iran', 'United Arab Emirates', 'Qatar'])
const FLIGHT_HOURS = {
  Mexico: 3, Canada: 3, 'Costa Rica': 4, Panama: 4, Portugal: 7, Spain: 8,
  Italy: 9, Greece: 10, France: 8, Germany: 9, 'United Kingdom': 7, Ireland: 7,
  Thailand: 18, Vietnam: 18, Japan: 14, Philippines: 16, Malaysia: 18,
  Australia: 20, 'New Zealand': 22,
}
const INSURANCE_USD = {
  Portugal: 1800, Spain: 2200, Mexico: 2400, 'Costa Rica': 2800, Panama: 2600,
  Thailand: 3200, Italy: 2000, Greece: 1900, France: 2400, Germany: 2800,
}
const BROADBAND = {
  'United States': 120, 'South Korea': 150, Japan: 110, Singapore: 200,
  Portugal: 85, Spain: 75, Germany: 90, France: 80, Mexico: 45, Thailand: 55,
}

const raw = fs.readFileSync(jsonPath, 'utf8')
const data = JSON.parse(raw)

for (const [country, entry] of Object.entries(data.countries)) {
  if (entry.alcohol_restricted == null) {
    entry.alcohol_restricted = ALCOHOL_RESTRICTED.has(country)
  }
  if (entry.dress_code_enforced == null) {
    entry.dress_code_enforced = DRESS_CODE.has(country)
  }
  if (entry.religious_law_basis == null) {
    entry.religious_law_basis = STRICT_SOCIAL.has(country)
  }
  if (entry.public_behavior_laws == null) {
    entry.public_behavior_laws = STRICT_SOCIAL.has(country) ? 'strict' : 'open'
  }
  if (entry.estimated_expat_insurance_usd == null) {
    entry.estimated_expat_insurance_usd = INSURANCE_USD[country] ?? 3000
  }
  if (entry.disaster_risk_score == null) {
    entry.disaster_risk_score = 35
  }
  if (entry.stability_score == null) {
    entry.stability_score = 65
  }
  if (entry.avg_broadband_mbps == null) {
    entry.avg_broadband_mbps = BROADBAND[country] ?? 50
  }
  if (entry.flight_hours_from_us == null) {
    entry.flight_hours_from_us = FLIGHT_HOURS[country] ?? 12
  }
}

fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`)
console.log('Updated preference country fields in retirement-tax-visa.json')
