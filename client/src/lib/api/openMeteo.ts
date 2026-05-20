import { readApiCache, writeApiCache } from './apiCache'

const NAMESPACE = 'openmeteo'
const CLIMATE_API = 'https://climate-api.open-meteo.com/v1/climate'
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search'

export type CityWeather = {
  temperatureC: number
  temperatureF: number
  humidityPct: number
  windSpeedKmh: number
  windSpeedMph: number
  condition: string
  localTimeLabel: string
}

export type MonthlyClimate = {
  month: number
  monthLabel: string
  avgHighC: number
  avgLowC: number
  avgPrecipMm: number
}

export type CityClimate = {
  monthly: MonthlyClimate[]
  annualAvgTempC: number
  annualPrecipMm: number
  summerAvgTempC: number
  winterAvgTempC: number
  wettestMonth: string
  driestMonth: string
  climateLabel: string
}

type GeocodingResponse = {
  results?: Array<{
    latitude?: number
    longitude?: number
    country?: string
  }>
}

type ClimateDailyResponse = {
  daily?: {
    time?: string[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_sum?: number[]
  }
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function celsiusToFahrenheit(c: number): number {
  return c * (9 / 5) + 32
}

function kmhToMph(kmh: number): number {
  return kmh * 0.621371
}

function weatherCodeLabel(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Cloudy'
  if (code === 45 || code === 48) return 'Foggy'
  if (code <= 55) return 'Drizzle'
  if (code <= 65) return 'Rainy'
  if (code <= 75) return 'Snowy'
  if (code <= 82) return 'Showers'
  if (code >= 95) return 'Thunderstorm'
  return 'Mixed'
}

function formatLocalTime(isoLocal: string): string {
  const match = isoLocal.match(/T(\d{2}):(\d{2})/)
  if (!match) return ''
  const hour24 = Number(match[1])
  const minute = match[2]
  const hour12 = hour24 % 12 || 12
  const meridiem = hour24 >= 12 ? 'PM' : 'AM'
  return `${hour12}:${minute} ${meridiem}`
}

function geocodeCacheKey(city: string, country: string): string {
  return `geo-${city.trim().toLowerCase()}-${country.trim().toLowerCase()}`
}

function climateCacheKey(lat: number, lng: number): string {
  return `climate-${lat.toFixed(2)}-${lng.toFixed(2)}`
}

function summerMonths(lat: number): number[] {
  return lat < 0 ? [12, 1, 2] : [6, 7, 8]
}

function winterMonths(lat: number): number[] {
  return lat < 0 ? [6, 7, 8] : [12, 1, 2]
}

function deriveClimateLabel(
  annualAvgTempC: number,
  summerAvgTempC: number,
  winterAvgTempC: number,
  annualPrecipMm: number,
): string {
  if (annualAvgTempC > 24 && annualPrecipMm > 1_200) return 'Tropical'
  if (summerAvgTempC > 25 && winterAvgTempC > 10) return 'Mediterranean'
  if (annualAvgTempC > 22) return 'Warm year-round'
  return 'Four seasons'
}

function aggregateClimate(daily: NonNullable<ClimateDailyResponse['daily']>, lat: number): CityClimate | null {
  const times = daily.time ?? []
  const highs = daily.temperature_2m_max ?? []
  const lows = daily.temperature_2m_min ?? []
  const precips = daily.precipitation_sum ?? []
  if (!times.length) return null

  const monthBuckets = Array.from({ length: 12 }, () => ({
    highSum: 0,
    lowSum: 0,
    precipSum: 0,
    count: 0,
  }))

  let annualTempSum = 0
  let annualTempCount = 0
  let annualPrecipSum = 0

  for (let i = 0; i < times.length; i += 1) {
    const high = highs[i]
    const low = lows[i]
    const precip = precips[i] ?? 0
    if (high == null || low == null || !Number.isFinite(high) || !Number.isFinite(low)) continue

    const month = Number(times[i].slice(5, 7)) - 1
    if (month < 0 || month > 11) continue

    monthBuckets[month].highSum += high
    monthBuckets[month].lowSum += low
    monthBuckets[month].precipSum += precip
    monthBuckets[month].count += 1

    annualTempSum += (high + low) / 2
    annualTempCount += 1
    annualPrecipSum += precip
  }

  if (!annualTempCount) return null

  const monthly: MonthlyClimate[] = monthBuckets.map((bucket, index) => ({
    month: index + 1,
    monthLabel: MONTH_LABELS[index],
    avgHighC: bucket.count ? bucket.highSum / bucket.count : 0,
    avgLowC: bucket.count ? bucket.lowSum / bucket.count : 0,
    avgPrecipMm: bucket.count ? bucket.precipSum / bucket.count : 0,
  }))

  const annualAvgTempC = annualTempSum / annualTempCount
  const summerSet = new Set(summerMonths(lat))
  const winterSet = new Set(winterMonths(lat))

  const summerTemps = monthly
    .filter((m) => summerSet.has(m.month))
    .map((m) => (m.avgHighC + m.avgLowC) / 2)
  const winterTemps = monthly
    .filter((m) => winterSet.has(m.month))
    .map((m) => (m.avgHighC + m.avgLowC) / 2)

  const summerAvgTempC =
    summerTemps.length ? summerTemps.reduce((a, b) => a + b, 0) / summerTemps.length : annualAvgTempC
  const winterAvgTempC =
    winterTemps.length ? winterTemps.reduce((a, b) => a + b, 0) / winterTemps.length : annualAvgTempC

  const wettest = [...monthly].sort((a, b) => b.avgPrecipMm - a.avgPrecipMm)[0]
  const driest = [...monthly].sort((a, b) => a.avgPrecipMm - b.avgPrecipMm)[0]

  return {
    monthly,
    annualAvgTempC,
    annualPrecipMm: annualPrecipSum,
    summerAvgTempC,
    winterAvgTempC,
    wettestMonth: wettest?.monthLabel ?? '—',
    driestMonth: driest?.monthLabel ?? '—',
    climateLabel: deriveClimateLabel(
      annualAvgTempC,
      summerAvgTempC,
      winterAvgTempC,
      annualPrecipSum,
    ),
  }
}

export async function resolveCityCoordinates(
  city: string,
  country: string,
  fallbackLat?: number,
  fallbackLng?: number,
): Promise<{ lat: number; lng: number } | null> {
  const key = geocodeCacheKey(city, country)
  const cached = readApiCache<{ lat: number; lng: number }>(NAMESPACE, key)
  if (cached) return cached

  try {
    const res = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(city)}&count=5`)
    if (res.ok) {
      const json = (await res.json()) as GeocodingResponse
      const countryNorm = country.trim().toLowerCase()
      const hit =
        json.results?.find((r) => r.country?.trim().toLowerCase() === countryNorm) ??
        json.results?.[0]
      if (hit?.latitude != null && hit?.longitude != null) {
        const coords = { lat: hit.latitude, lng: hit.longitude }
        writeApiCache(NAMESPACE, key, coords)
        return coords
      }
    }
  } catch {
    /* fall through to map coords */
  }

  if (Number.isFinite(fallbackLat) && Number.isFinite(fallbackLng)) {
    const coords = { lat: fallbackLat as number, lng: fallbackLng as number }
    writeApiCache(NAMESPACE, key, coords)
    return coords
  }

  return null
}

export async function getCityClimate(lat: number, lng: number): Promise<CityClimate | null> {
  const key = climateCacheKey(lat, lng)
  const cached = readApiCache<CityClimate>(NAMESPACE, key)
  if (cached) return cached

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      models: 'EC_Earth3P_HR',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
      start_date: '1990-01-01',
      end_date: '2020-12-31',
    })
    const res = await fetch(`${CLIMATE_API}?${params}`)
    if (!res.ok) return null

    const json = (await res.json()) as ClimateDailyResponse
    if (!json.daily) return null

    const climate = aggregateClimate(json.daily, lat)
    if (climate) writeApiCache(NAMESPACE, key, climate)
    return climate
  } catch {
    return null
  }
}

export async function getCityClimateForPlace(
  city: string,
  country: string,
  fallbackLat?: number,
  fallbackLng?: number,
): Promise<CityClimate | null> {
  const coords = await resolveCityCoordinates(city, country, fallbackLat, fallbackLng)
  if (!coords) return null
  return getCityClimate(coords.lat, coords.lng)
}

export async function getCityWeather(lat: number, lng: number): Promise<CityWeather | null> {
  const key = `current-${lat.toFixed(2)}-${lng.toFixed(2)}`
  const cached = readApiCache<CityWeather>(NAMESPACE, key)
  if (cached) return cached

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
      timezone: 'auto',
    })
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    if (!res.ok) return null

    const json = (await res.json()) as {
      current?: {
        time?: string
        temperature_2m?: number
        relative_humidity_2m?: number
        weather_code?: number
        wind_speed_10m?: number
      }
    }
    const current = json.current
    const tempC = current?.temperature_2m
    if (tempC == null || !Number.isFinite(tempC)) return null

    const weather: CityWeather = {
      temperatureC: Math.round(tempC),
      temperatureF: Math.round(celsiusToFahrenheit(tempC)),
      humidityPct: Math.round(current?.relative_humidity_2m ?? 0),
      windSpeedKmh: Math.round(current?.wind_speed_10m ?? 0),
      windSpeedMph: Math.round(kmhToMph(current?.wind_speed_10m ?? 0)),
      condition: weatherCodeLabel(current?.weather_code ?? -1),
      localTimeLabel: current?.time ? formatLocalTime(current.time) : '',
    }

    writeApiCache(NAMESPACE, key, weather)
    return weather
  } catch {
    return null
  }
}

export function formatTemp(celsius: number, unit: 'c' | 'f'): string {
  if (unit === 'f') return `${Math.round(celsiusToFahrenheit(celsius))}°F`
  return `${Math.round(celsius)}°C`
}

export function formatTemperatureDual(weather: CityWeather): string {
  return `${weather.temperatureF}°F (${weather.temperatureC}°C)`
}

export function formatWindDual(weather: CityWeather): string {
  return `${weather.windSpeedMph} mph (${weather.windSpeedKmh} km/h)`
}
