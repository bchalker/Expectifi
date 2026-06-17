#!/usr/bin/env node
/**
 * Pre-fetch NASA POWER climatology normals for map/scoring cities.
 * Run: node scripts/refresh-climate-normals.mjs [options]
 *
 * Options:
 *   --resume          Skip cities that already have valid normals in the output file
 *   --max-new=N       Fetch at most N cities this run
 *   --limit=N         Process only first N cities from the map set (debug)
 *   --key=city|country  Single city only
 *
 * Uses bundled lat/lng from city-coordinates.json (no geocoding).
 * Output: client/src/data/climate-normals.json
 *
 * Source: NASA POWER Climatology API (MERRA-2), custom period 2011–2020.
 * One HTTP request per city (~1s + 250ms throttle → full ~922-city run ~16 min).
 * Use T2M_MAX_AVG / T2M_MIN_AVG (daily-mean highs/lows), not T2M_MAX/T2M_MIN extremes.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../client/src/data')
const CSV_PATH = path.join(DATA_DIR, 'cost-of-living.csv')
const COORDS_PATH = path.join(DATA_DIR, 'city-coordinates.json')
const OUTPUT_PATH = path.join(DATA_DIR, 'climate-normals.json')

const NASA_API_BASE = 'https://power.larc.nasa.gov/api/temporal/climatology/point'
const NASA_PARAMS = 'T2M,T2M_MAX_AVG,T2M_MIN_AVG,RH2M,PRECTOTCORR'
const SOURCE_START = '2011'
const SOURCE_END = '2020'
const SOURCE_PERIOD = '2011-2020'
const SOURCE_NAME = 'nasa_power'
const SCOPE_VARIABLES = ['T2M', 'T2M_MAX_AVG', 'T2M_MIN_AVG', 'RH2M', 'PRECTOTCORR']

const THROTTLE_MS = 250
const MAX_RETRIES = 4
const RETRY_BASE_MS = 15_000

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_KEYS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Mirrors EXCLUDED_COUNTRIES in client/src/utils/costOfLiving.ts */
const EXCLUDED_COUNTRIES = new Set(
  [
    'Russia',
    'Belarus',
    'Iran',
    'Syria',
    'Cuba',
    'Ukraine',
    'Myanmar',
    'North Korea',
    'Yemen',
    'Sudan',
    'Somalia',
    'Libya',
    'Saudi Arabia',
    'Afghanistan',
    'Brunei',
    'Mauritania',
  ].map((c) => c.trim().toLowerCase()),
)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function currentGeneratedStamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function cityKey(city, country) {
  return `${city}|${country}`
}

function isValidClimate(climate) {
  if (!climate?.monthly?.length || climate.monthly.length !== 12) return false
  return climate.monthly.every(
    (month) =>
      Number.isFinite(month.avgHighC) &&
      Number.isFinite(month.avgLowC) &&
      Number.isFinite(month.avgPrecipMm),
  )
}

function parseCliArgs(argv) {
  let limit = null
  let singleKey = null
  let resume = false
  let maxNew = null

  for (const arg of argv) {
    if (arg === '--resume') {
      resume = true
    } else if (arg.startsWith('--limit=')) {
      limit = Number(arg.slice('--limit='.length))
    } else if (arg.startsWith('--max-new=')) {
      maxNew = Number(arg.slice('--max-new='.length))
    } else if (arg.startsWith('--key=')) {
      singleKey = arg.slice('--key='.length)
    }
  }

  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    singleKey,
    resume,
    maxNew: Number.isFinite(maxNew) && maxNew > 0 ? maxNew : null,
  }
}

function buildColumnIndex(headerLine) {
  return Object.fromEntries(
    headerLine
      .trim()
      .split(',')
      .map((name, index) => [name.replace(/\r$/, ''), index]),
  )
}

function parseNumber(value) {
  const n = Number((value ?? '0').replace(/\r/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Same city set as getAllMapCities() in costOfLiving.ts */
function loadMapCityKeys(coords) {
  const raw = fs.readFileSync(CSV_PATH, 'utf8')
  const lines = raw.trim().split('\n')
  const header = lines[0] ?? ''
  const columnIndex = buildColumnIndex(header)

  const cityIdx = columnIndex.city
  const countryIdx = columnIndex.country
  const rentIdx = columnIndex.rent_1br_outside_centre

  const keys = []

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const parts = line.split(',')
    const city = (parts[cityIdx] ?? '').replace(/\r/g, '')
    const country = (parts[countryIdx] ?? '').replace(/\r/g, '')
    const rent = parseNumber(parts[rentIdx])

    if (!city || !country) continue
    if (EXCLUDED_COUNTRIES.has(country.trim().toLowerCase())) continue
    if (rent <= 0) continue

    const key = cityKey(city, country)
    const hit = coords[key]
    if (!hit || !Number.isFinite(hit.lat) || !Number.isFinite(hit.lng)) continue

    keys.push({ key, city, country, lat: hit.lat, lng: hit.lng })
  }

  return keys
}

function readExistingOutput() {
  if (!fs.existsSync(OUTPUT_PATH)) return null
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))
  } catch {
    return null
  }
}

function summerMonths(lat) {
  return lat < 0 ? [12, 1, 2] : [6, 7, 8]
}

function winterMonths(lat) {
  return lat < 0 ? [6, 7, 8] : [12, 1, 2]
}

function deriveClimateLabel(annualAvgTempC, summerAvgTempC, winterAvgTempC, annualPrecipMm) {
  if (annualAvgTempC > 24 && annualPrecipMm > 1_200) return 'Tropical'
  if (summerAvgTempC > 25 && winterAvgTempC > 10) return 'Mediterranean'
  if (annualAvgTempC > 22) return 'Warm year-round'
  return 'Four seasons'
}

function isFiniteNumber(value) {
  return value != null && Number.isFinite(value)
}

/**
 * Map NASA POWER climatology JSON to CityClimate-compatible object.
 * PRECTOTCORR is mm/day (mean daily precip), matching Open-Meteo daily averages.
 */
function mapFromNasaPower(json, lat) {
  const p = json?.properties?.parameter
  if (!p?.T2M_MAX_AVG || !p.T2M_MIN_AVG || !p.PRECTOTCORR || !p.RH2M || !p.T2M) {
    return null
  }

  const monthly = MONTH_KEYS.map((key, index) => {
    const avgHighC = p.T2M_MAX_AVG[key]
    const avgLowC = p.T2M_MIN_AVG[key]
    const avgPrecipMm = p.PRECTOTCORR[key]
    const humidity = p.RH2M[key]
    if (
      !isFiniteNumber(avgHighC) ||
      !isFiniteNumber(avgLowC) ||
      !isFiniteNumber(avgPrecipMm) ||
      !isFiniteNumber(humidity)
    ) {
      return null
    }
    return {
      month: index + 1,
      monthLabel: MONTH_LABELS[index],
      avgHighC,
      avgLowC,
      avgPrecipMm,
      avgHumidityPct: Math.round(humidity),
    }
  })

  if (monthly.some((row) => row == null)) return null

  const annualAvgTempC = p.T2M.ANN
  const annualAvgHumidityPct = Math.round(p.RH2M.ANN)
  if (!isFiniteNumber(annualAvgTempC) || !isFiniteNumber(annualAvgHumidityPct)) {
    return null
  }

  const annualPrecipMm = MONTH_KEYS.reduce(
    (sum, key, index) => sum + p.PRECTOTCORR[key] * DAYS_IN_MONTH[index],
    0,
  )

  const summerSet = new Set(summerMonths(lat))
  const winterSet = new Set(winterMonths(lat))

  const summerTemps = monthly
    .filter((m) => summerSet.has(m.month))
    .map((m) => (m.avgHighC + m.avgLowC) / 2)
  const winterTemps = monthly
    .filter((m) => winterSet.has(m.month))
    .map((m) => (m.avgHighC + m.avgLowC) / 2)

  const summerAvgTempC = summerTemps.length
    ? summerTemps.reduce((a, b) => a + b, 0) / summerTemps.length
    : annualAvgTempC
  const winterAvgTempC = winterTemps.length
    ? winterTemps.reduce((a, b) => a + b, 0) / winterTemps.length
    : annualAvgTempC

  const wettest = [...monthly].sort((a, b) => b.avgPrecipMm - a.avgPrecipMm)[0]
  const driest = [...monthly].sort((a, b) => a.avgPrecipMm - b.avgPrecipMm)[0]

  return {
    monthly,
    annualAvgTempC,
    annualAvgHumidityPct,
    annualPrecipMm,
    summerAvgTempC,
    winterAvgTempC,
    wettestMonth: wettest?.monthLabel ?? '—',
    driestMonth: driest?.monthLabel ?? '—',
    climateLabel: deriveClimateLabel(
      annualAvgTempC,
      summerAvgTempC,
      winterAvgTempC,
      annualPrecipMm,
    ),
    source_period: SOURCE_PERIOD,
    variables: [...SCOPE_VARIABLES],
  }
}

async function fetchCityClimate(lat, lng) {
  const params = new URLSearchParams({
    parameters: NASA_PARAMS,
    community: 'AG',
    longitude: String(lng),
    latitude: String(lat),
    start: SOURCE_START,
    end: SOURCE_END,
    format: 'JSON',
  })

  let lastError = 'unknown error'

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const res = await fetch(`${NASA_API_BASE}?${params}`)

    if (res.status === 429) {
      lastError = 'rate limit (429)'
      const waitMs = RETRY_BASE_MS * (attempt + 1)
      if (attempt < MAX_RETRIES) {
        console.log(
          `      rate limited — waiting ${waitMs / 1000}s before retry ${attempt + 1}/${MAX_RETRIES}`,
        )
        await sleep(waitMs)
        continue
      }
      return { climate: null, error: lastError, status: 429 }
    }

    let json
    try {
      json = await res.json()
    } catch {
      lastError = 'invalid JSON response'
      return { climate: null, error: lastError, status: res.status }
    }

    if (!res.ok) {
      lastError = json?.message ?? json?.reason ?? `HTTP ${res.status}`
      return { climate: null, error: lastError, status: res.status }
    }

    if (!json?.properties?.parameter) {
      return { climate: null, error: 'response missing properties.parameter', status: res.status }
    }

    const climate = mapFromNasaPower(json, lat)
    if (!isValidClimate(climate)) {
      return { climate: null, error: 'mapping produced invalid monthly data', status: res.status }
    }

    return { climate, error: null, status: res.status }
  }

  return { climate: null, error: lastError, status: 429 }
}

function countValid(cities) {
  let valid = 0
  let nullCount = 0
  for (const value of Object.values(cities)) {
    if (isValidClimate(value)) valid += 1
    else nullCount += 1
  }
  return { valid, nullCount }
}

function printClimateSummary(key, climate) {
  const july = climate.monthly.find((m) => m.month === 7)
  const jan = climate.monthly.find((m) => m.month === 1)
  console.log('')
  console.log(`Validation summary for ${key}:`)
  console.log(`  source=${SOURCE_NAME} period=${climate.source_period}`)
  console.log(`  variables=${JSON.stringify(climate.variables)}`)
  console.log(`  annualAvgTempC=${climate.annualAvgTempC.toFixed(2)}`)
  console.log(`  annualAvgHumidityPct=${climate.annualAvgHumidityPct}`)
  console.log(`  annualPrecipMm=${climate.annualPrecipMm.toFixed(1)}`)
  console.log(`  summerAvgTempC=${climate.summerAvgTempC.toFixed(2)}`)
  console.log(`  winterAvgTempC=${climate.winterAvgTempC.toFixed(2)}`)
  if (july) {
    console.log(
      `  July avgHighC=${july.avgHighC.toFixed(2)} avgLowC=${july.avgLowC.toFixed(2)} humidity=${july.avgHumidityPct} precip=${july.avgPrecipMm.toFixed(2)} mm/day`,
    )
  }
  if (jan) {
    console.log(
      `  Jan avgHighC=${jan.avgHighC.toFixed(2)} avgLowC=${jan.avgLowC.toFixed(2)} humidity=${jan.avgHumidityPct} precip=${jan.avgPrecipMm.toFixed(2)} mm/day`,
    )
  }
}

async function main() {
  const runStarted = Date.now()
  const { limit, singleKey, resume, maxNew } = parseCliArgs(process.argv.slice(2))
  const coords = JSON.parse(fs.readFileSync(COORDS_PATH, 'utf8'))
  const existing = readExistingOutput()
  const existingCities = existing?.cities ?? {}

  let targets = loadMapCityKeys(coords)

  if (singleKey) {
    targets = targets.filter((t) => t.key === singleKey)
    if (!targets.length) {
      console.error(`No map city found for key: ${singleKey}`)
      process.exit(1)
    }
  } else if (limit) {
    targets = targets.slice(0, limit)
  }

  if (resume) {
    targets = targets.filter((t) => !isValidClimate(existingCities[t.key]))
  }

  if (maxNew != null) {
    targets = targets.slice(0, maxNew)
  }

  const generated = currentGeneratedStamp()
  const cities = resume ? { ...existingCities } : {}
  let fetched = 0
  let newValid = 0
  let newFailed = 0
  const failures = []

  console.log(`Climate API: ${NASA_API_BASE}`)
  console.log(
    `Source: ${SOURCE_NAME}, period=${SOURCE_PERIOD}, params=${NASA_PARAMS}`,
  )
  console.log(
    `Fetching ${targets.length} cities (throttle ${THROTTLE_MS}ms, resume=${resume}, max-new=${maxNew ?? 'none'})...`,
  )

  if (!targets.length) {
    console.log('Nothing to fetch.')
  }

  for (let i = 0; i < targets.length; i += 1) {
    const { key, lat, lng } = targets[i]

    try {
      const { climate, error, status } = await fetchCityClimate(lat, lng)
      fetched += 1
      cities[key] = climate

      if (isValidClimate(climate)) {
        newValid += 1
        console.log(`OK    [${i + 1}/${targets.length}] ${key} (HTTP ${status})`)
        if (singleKey) {
          printClimateSummary(key, climate)
        }
      } else {
        newFailed += 1
        failures.push({ key, error: error ?? 'empty response' })
        console.log(`FAIL  [${i + 1}/${targets.length}] ${key} — ${error ?? 'empty response'}`)
      }
    } catch (err) {
      fetched += 1
      cities[key] = null
      newFailed += 1
      const message = err?.message ?? String(err)
      failures.push({ key, error: message })
      console.log(`FAIL  [${i + 1}/${targets.length}] ${key} — ${message}`)
    }

    if (i < targets.length - 1) {
      await sleep(THROTTLE_MS)
    }
  }

  const totals = countValid(cities)
  const elapsedSec = ((Date.now() - runStarted) / 1000).toFixed(1)
  const dataset = {
    metadata: {
      generated,
      source: SOURCE_NAME,
      period: SOURCE_PERIOD,
      default_variables: [...SCOPE_VARIABLES],
      reanalysis: 'MERRA-2',
      coordinates: 'city-coordinates.json (bundled lat/lng, no geocoding)',
      requests_per_city: 1,
      throttle_ms: THROTTLE_MS,
      total_cities: Object.keys(cities).length,
      valid_count: totals.valid,
      null_count: totals.nullCount,
      last_run_fetched: fetched,
      last_run_valid: newValid,
      last_run_failed: newFailed,
      last_run_elapsed_sec: Number(elapsedSec),
    },
    cities,
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`)

  const sizeKb = Math.round(fs.statSync(OUTPUT_PATH).size / 1024)
  console.log('')
  console.log(
    `Summary: this_run valid=${newValid}, failed=${newFailed}, fetched=${fetched}, elapsed=${elapsedSec}s`,
  )
  console.log(
    `File totals: valid=${totals.valid}, null=${totals.nullCount}, size=${sizeKb}KB, path=${OUTPUT_PATH}`,
  )
  if (failures.length) {
    console.log('Failures:')
    for (const f of failures) {
      console.log(`  ${f.key}: ${f.error}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
