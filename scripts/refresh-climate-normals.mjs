#!/usr/bin/env node
/**
 * Pre-fetch Open-Meteo climate normals for map/scoring cities.
 * Run: node scripts/refresh-climate-normals.mjs [options]
 *
 * Options:
 *   --resume          Skip cities that already have valid normals in the output file
 *   --max-new=N       Fetch at most N cities this run (daily cron uses 20)
 *   --limit=N         Process only first N cities from the map set (debug)
 *   --key=city|country  Single city only
 *
 * Uses bundled lat/lng from city-coordinates.json (no geocoding).
 * Output: client/src/data/climate-normals.json
 *
 * Scope (e): 2011-01-01–2020-12-31, 3 daily variables (no precipitation_sum).
 * Open-Meteo weighted-call estimate per city:
 *   published formula ≈ 78  (1 loc × 3653 days / 14 × 3 vars / 10)
 *   empirical scale   ≈ 303 (proportional to full 1990–2020 / 4-var ~1250 baseline)
 * Free tier 10k/day → ~33 cities/day empirical, ~127/day by formula.
 * Daily cron uses --max-new=20 for backoff headroom.
 *
 * Existing entries at other scopes (e.g. 1990–2020 with precip) are kept by --resume.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../client/src/data')
const CSV_PATH = path.join(DATA_DIR, 'cost-of-living.csv')
const COORDS_PATH = path.join(DATA_DIR, 'city-coordinates.json')
const OUTPUT_PATH = path.join(DATA_DIR, 'climate-normals.json')

const CLIMATE_API_BASE = process.env.OPEN_METEO_API_KEY
  ? 'https://customer-climate-api.open-meteo.com/v1/climate'
  : 'https://climate-api.open-meteo.com/v1/climate'

const THROTTLE_MS = 250
const MAX_RETRIES = 4
const RETRY_BASE_MS = 15_000

const START_DATE = '2011-01-01'
const END_DATE = '2020-12-31'
const DAILY_VARS =
  'temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean'
const SCOPE_VARIABLES = ['temp_max', 'temp_min', 'humidity']
const SOURCE_PERIOD = '2011-2020'
const SCOPE_DAYS = 3653

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
  if (!climate?.monthly?.length) return false
  return climate.monthly.every(
    (month) => Number.isFinite(month.avgHighC) && Number.isFinite(month.avgLowC),
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

/**
 * Duplicated from aggregateClimate() in client/src/lib/api/openMeteo.ts.
 * Scope (e): no precipitation_sum — avgPrecipMm omitted from monthly rows.
 */
function aggregateClimate(daily, lat, { includePrecip = false } = {}) {
  const times = daily.time ?? []
  const highs = daily.temperature_2m_max ?? []
  const lows = daily.temperature_2m_min ?? []
  const precips = daily.precipitation_sum ?? []
  const humidities = daily.relative_humidity_2m_mean ?? []
  if (!times.length) return null

  const monthBuckets = Array.from({ length: 12 }, () => ({
    highSum: 0,
    lowSum: 0,
    precipSum: 0,
    humiditySum: 0,
    humidityCount: 0,
    count: 0,
  }))

  let annualTempSum = 0
  let annualTempCount = 0
  let annualPrecipSum = 0
  let annualHumiditySum = 0
  let annualHumidityCount = 0

  for (let i = 0; i < times.length; i += 1) {
    const high = highs[i]
    const low = lows[i]
    const precip = includePrecip ? (precips[i] ?? 0) : 0
    const humidity = humidities[i]
    if (high == null || low == null || !Number.isFinite(high) || !Number.isFinite(low)) continue

    const month = Number(times[i].slice(5, 7)) - 1
    if (month < 0 || month > 11) continue

    monthBuckets[month].highSum += high
    monthBuckets[month].lowSum += low
    if (includePrecip) {
      monthBuckets[month].precipSum += precip
    }
    monthBuckets[month].count += 1

    if (humidity != null && Number.isFinite(humidity)) {
      monthBuckets[month].humiditySum += humidity
      monthBuckets[month].humidityCount += 1
      annualHumiditySum += humidity
      annualHumidityCount += 1
    }

    annualTempSum += (high + low) / 2
    annualTempCount += 1
    if (includePrecip) {
      annualPrecipSum += precip
    }
  }

  if (!annualTempCount) return null

  const monthly = monthBuckets.map((bucket, index) => {
    const row = {
      month: index + 1,
      monthLabel: MONTH_LABELS[index],
      avgHighC: bucket.count ? bucket.highSum / bucket.count : 0,
      avgLowC: bucket.count ? bucket.lowSum / bucket.count : 0,
      avgHumidityPct:
        bucket.humidityCount > 0
          ? Math.round(bucket.humiditySum / bucket.humidityCount)
          : undefined,
    }
    if (includePrecip && bucket.count) {
      row.avgPrecipMm = bucket.precipSum / bucket.count
    }
    return row
  })

  const annualAvgTempC = annualTempSum / annualTempCount
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

  let wettestMonth = '—'
  let driestMonth = '—'
  if (includePrecip) {
    const wettest = [...monthly].sort((a, b) => (b.avgPrecipMm ?? 0) - (a.avgPrecipMm ?? 0))[0]
    const driest = [...monthly].sort((a, b) => (a.avgPrecipMm ?? 0) - (b.avgPrecipMm ?? 0))[0]
    wettestMonth = wettest?.monthLabel ?? '—'
    driestMonth = driest?.monthLabel ?? '—'
  }

  const climate = {
    monthly,
    annualAvgTempC,
    annualAvgHumidityPct:
      annualHumidityCount > 0 ? Math.round(annualHumiditySum / annualHumidityCount) : null,
    summerAvgTempC,
    winterAvgTempC,
    wettestMonth,
    driestMonth,
    climateLabel: deriveClimateLabel(
      annualAvgTempC,
      summerAvgTempC,
      winterAvgTempC,
      annualPrecipSum,
    ),
    source_period: SOURCE_PERIOD,
    variables: [...SCOPE_VARIABLES],
  }

  if (includePrecip) {
    climate.annualPrecipMm = annualPrecipSum
  }

  return climate
}

async function fetchCityClimate(lat, lng) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    models: 'EC_Earth3P_HR',
    daily: DAILY_VARS,
    start_date: START_DATE,
    end_date: END_DATE,
  })

  if (process.env.OPEN_METEO_API_KEY) {
    params.set('apikey', process.env.OPEN_METEO_API_KEY)
  }

  let lastError = 'unknown error'

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const res = await fetch(`${CLIMATE_API_BASE}?${params}`)

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

    const json = await res.json()

    if (!res.ok || json.error) {
      lastError = json.reason ?? `HTTP ${res.status}`
      return { climate: null, error: lastError, status: res.status }
    }

    if (!json.daily) {
      return { climate: null, error: 'response missing daily block', status: res.status }
    }

    const climate = aggregateClimate(json.daily, lat, { includePrecip: false })
    if (!isValidClimate(climate)) {
      return { climate: null, error: 'aggregation produced empty monthly data', status: res.status }
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
  console.log(`  HTTP aggregated OK — source_period=${climate.source_period}`)
  console.log(`  variables=${JSON.stringify(climate.variables)}`)
  console.log(`  annualAvgTempC=${climate.annualAvgTempC.toFixed(2)}`)
  console.log(`  annualAvgHumidityPct=${climate.annualAvgHumidityPct}`)
  console.log(`  summerAvgTempC=${climate.summerAvgTempC.toFixed(2)}`)
  console.log(`  winterAvgTempC=${climate.winterAvgTempC.toFixed(2)}`)
  if (july) {
    console.log(
      `  July avgHighC=${july.avgHighC.toFixed(2)} avgLowC=${july.avgLowC.toFixed(2)} humidity=${july.avgHumidityPct ?? '—'}`,
    )
  }
  if (jan) {
    console.log(
      `  Jan avgHighC=${jan.avgHighC.toFixed(2)} avgLowC=${jan.avgLowC.toFixed(2)} humidity=${jan.avgHumidityPct ?? '—'}`,
    )
  }
  console.log(`  monthly avgPrecipMm present: ${climate.monthly.some((m) => m.avgPrecipMm != null)}`)
}

async function main() {
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
  const cities = { ...existingCities }
  let fetched = 0
  let newValid = 0
  let newFailed = 0

  console.log(
    `Climate API: ${CLIMATE_API_BASE}${process.env.OPEN_METEO_API_KEY ? ' (customer key)' : ' (free tier)'}`,
  )
  console.log(
    `Scope: ${SOURCE_PERIOD}, vars=${DAILY_VARS}, ~${SCOPE_DAYS} days (~78 formula / ~303 empirical weighted calls/city)`,
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
        console.log(`FAIL  [${i + 1}/${targets.length}] ${key} — ${error ?? 'empty response'}`)
      }
    } catch (err) {
      fetched += 1
      cities[key] = null
      newFailed += 1
      console.log(`FAIL  [${i + 1}/${targets.length}] ${key} — ${err?.message ?? err}`)
    }

    if (i < targets.length - 1) {
      await sleep(THROTTLE_MS)
    }
  }

  const totals = countValid(cities)
  const dataset = {
    metadata: {
      generated,
      source: 'Open-Meteo',
      default_source_period: SOURCE_PERIOD,
      default_variables: [...SCOPE_VARIABLES],
      model: 'EC_Earth3P_HR',
      coordinates: 'city-coordinates.json (bundled lat/lng, no geocoding)',
      weighted_calls_per_city_formula: Math.round((SCOPE_DAYS / 14) * (SCOPE_VARIABLES.length / 10)),
      weighted_calls_per_city_empirical: 303,
      total_cities: Object.keys(cities).length,
      valid_count: totals.valid,
      null_count: totals.nullCount,
      last_run_fetched: fetched,
      last_run_valid: newValid,
      last_run_failed: newFailed,
    },
    cities,
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`)

  const sizeKb = Math.round(fs.statSync(OUTPUT_PATH).size / 1024)
  console.log('')
  console.log(
    `Summary: this_run valid=${newValid}, failed=${newFailed}, fetched=${fetched}; file totals valid=${totals.valid}, null=${totals.nullCount}, size=${sizeKb}KB, file=${OUTPUT_PATH}`,
  )

  if (newFailed > 0 && !process.env.OPEN_METEO_API_KEY) {
    console.log('')
    console.log(
      'Tip: scope (e) ≈ ~303 empirical weighted calls/city (~33 cities/day). Re-run with --resume --max-new=20 daily.',
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
