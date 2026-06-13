#!/usr/bin/env node
/**
 * Refresh direct US flight routes in getting-there.json via Amadeus Airport Routes API.
 * Run: node scripts/refresh-flight-routes.mjs [json-path] [--country=Name]
 *
 * Requires: AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET
 * Optional: AMADEUS_HOSTNAME ("test" default, "production" for full coverage)
 * Optional: --country=Portugal or --country=Portugal,Italy (repeatable, case-insensitive)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Amadeus from 'amadeus'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_JSON_PATH = path.join(__dirname, '../client/src/data/getting-there.json')
const THROTTLE_MS = 250

/** IATA → friendly label (matches direct_us_cities style in getting-there.json). */
const US_AIRPORTS = {
  ATL: 'Atlanta',
  BOS: 'Boston',
  CLT: 'Charlotte',
  ORD: 'Chicago',
  DFW: 'Dallas',
  DEN: 'Denver',
  FLL: 'Fort Lauderdale',
  GUM: 'Guam',
  HNL: 'Honolulu',
  IAH: 'Houston',
  LAX: 'Los Angeles',
  MIA: 'Miami',
  EWR: 'Newark',
  MCO: 'Orlando',
  PHL: 'Philadelphia',
  SFO: 'San Francisco',
  SEA: 'Seattle',
  IAD: 'Washington DC',
  JFK: 'New York (JFK)',
}

const US_CITY_SORT_ORDER = [
  'New York (JFK)',
  'Miami',
  'Los Angeles',
  'Boston',
  'Chicago',
  'Washington DC',
  'San Francisco',
  'Atlanta',
  'Dallas',
  'Houston',
  'Denver',
  'Seattle',
  'Philadelphia',
  'Orlando',
  'Charlotte',
  'Fort Lauderdale',
  'Newark',
  'Honolulu',
  'Guam',
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function currentVerifiedStamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function isSkippableAirportCode(code) {
  const trimmed = code?.trim()
  if (!trimmed) return true
  return trimmed.toLowerCase() === 'various'
}

function sortUsCities(cities) {
  const orderIndex = new Map(US_CITY_SORT_ORDER.map((label, index) => [label, index]))
  return [...cities].sort((a, b) => {
    const ia = orderIndex.has(a) ? orderIndex.get(a) : 999
    const ib = orderIndex.has(b) ? orderIndex.get(b) : 999
    if (ia !== ib) return ia - ib
    return a.localeCompare(b)
  })
}

function extractUsIataCodes(responseData) {
  const codes = new Set()
  if (!Array.isArray(responseData)) return codes
  for (const entry of responseData) {
    const iata = entry?.iataCode?.trim()?.toUpperCase()
    if (iata && US_AIRPORTS[iata]) {
      codes.add(iata)
    }
  }
  return codes
}

async function fetchDirectDestinations(amadeus, airportCode) {
  const response = await amadeus.client.get('/v1/airport/direct-destinations', {
    departureAirportCode: airportCode,
    max: 200,
  })
  return response.data
}

async function verifyCountry(amadeus, countryName, countryData) {
  const airportCodes = countryData.main_airports
    .map((airport) => airport.code)
    .filter((code) => !isSkippableAirportCode(code))

  if (airportCodes.length === 0) {
    return { status: 'skipped', reason: 'no valid airport codes' }
  }

  const usIataCodes = new Set()
  let successCount = 0
  const failures = []

  for (const code of airportCodes) {
    try {
      const data = await fetchDirectDestinations(amadeus, code)
      const found = extractUsIataCodes(data)
      for (const iata of found) {
        usIataCodes.add(iata)
      }
      successCount += 1
    } catch (err) {
      const message = err?.response?.data?.errors?.[0]?.detail ?? err?.message ?? String(err)
      failures.push(`${code}: ${message}`)
    }
    await sleep(THROTTLE_MS)
  }

  if (successCount === 0) {
    return {
      status: 'skipped',
      reason: `all airport lookups failed (${failures.join('; ')})`,
    }
  }

  const keepUsCities = Array.isArray(countryData.keep_us_cities) ? countryData.keep_us_cities : []
  const citySet = new Set()

  for (const iata of usIataCodes) {
    citySet.add(US_AIRPORTS[iata])
  }
  for (const city of keepUsCities) {
    const trimmed = city?.trim()
    if (trimmed) citySet.add(trimmed)
  }

  const directUsCities = sortUsCities(citySet)

  return {
    status: 'verified',
    direct_us_cities: directUsCities,
    direct_from_us: directUsCities.length > 0,
    failures,
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return value
}

function parseCliArgs(argv) {
  let jsonPath = DEFAULT_JSON_PATH
  const countryFilters = []

  for (const arg of argv) {
    if (arg.startsWith('--country=')) {
      const value = arg.slice('--country='.length)
      for (const part of value.split(',')) {
        const name = part.trim()
        if (name) countryFilters.push(name)
      }
    } else if (!arg.startsWith('-')) {
      jsonPath = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg)
    }
  }

  return { jsonPath, countryFilters }
}

function resolveCountryScope(countryFilters, allCountryKeys) {
  if (countryFilters.length === 0) {
    return { included: allCountryKeys, unmatched: [] }
  }

  const keyByLower = new Map(allCountryKeys.map((key) => [key.toLowerCase(), key]))
  const included = []
  const unmatched = []
  const seen = new Set()

  for (const filter of countryFilters) {
    const key = keyByLower.get(filter.toLowerCase())
    if (key) {
      if (!seen.has(key)) {
        seen.add(key)
        included.push(key)
      }
    } else {
      unmatched.push(filter)
    }
  }

  return { included, unmatched }
}

async function main() {
  const { jsonPath, countryFilters } = parseCliArgs(process.argv.slice(2))

  const clientId = requireEnv('AMADEUS_CLIENT_ID')
  const clientSecret = requireEnv('AMADEUS_CLIENT_SECRET')
  const hostname = process.env.AMADEUS_HOSTNAME === 'production' ? 'production' : 'test'

  const amadeus = new Amadeus({
    clientId,
    clientSecret,
    hostname,
  })

  const raw = fs.readFileSync(jsonPath, 'utf8')
  const dataset = JSON.parse(raw)
  const stamp = currentVerifiedStamp()
  const allCountryKeys = Object.keys(dataset.countries)
  const { included, unmatched } = resolveCountryScope(countryFilters, allCountryKeys)

  if (unmatched.length > 0) {
    console.warn(`Warning: no country match for: ${unmatched.join(', ')}`)
  }

  if (countryFilters.length > 0) {
    if (included.length === 0) {
      console.error('No matching countries to process.')
      process.exit(1)
    }
    console.log(`Scope: ${included.join(', ')}`)
  }

  const countriesToProcess =
    countryFilters.length > 0
      ? included.map((name) => [name, dataset.countries[name]])
      : Object.entries(dataset.countries)

  let verified = 0
  let skipped = 0
  const skippedCountries = []

  for (const [countryName, countryData] of countriesToProcess) {
    const result = await verifyCountry(amadeus, countryName, countryData)

    if (result.status === 'skipped') {
      skipped += 1
      skippedCountries.push(`${countryName} (${result.reason})`)
      console.log(`SKIP  ${countryName}: unverified, kept existing — ${result.reason}`)
      continue
    }

    countryData.direct_us_cities = result.direct_us_cities
    countryData.direct_from_us = result.direct_from_us
    countryData._verified_at = stamp
    verified += 1

    if (result.failures.length > 0) {
      console.log(`WARN  ${countryName}: partial failures — ${result.failures.join('; ')}`)
    }
    console.log(
      `OK    ${countryName}: ${result.direct_us_cities.length} US cities (direct_from_us=${result.direct_from_us})`,
    )
  }

  fs.writeFileSync(jsonPath, `${JSON.stringify(dataset, null, 2)}\n`)

  console.log('')
  console.log(
    `Summary: verified=${verified}, skipped=${skipped}, stamp=${stamp}, hostname=${hostname}, file=${jsonPath}`,
  )
  if (skippedCountries.length > 0) {
    console.log('Skipped countries:')
    for (const line of skippedCountries) {
      console.log(`  - ${line}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
