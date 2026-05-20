import csvRaw from '../data/cost-of-living.csv?raw'
import cityCoordinates from '../data/city-coordinates.json'

export type CityData = {
  city: string
  country: string
  meal_inexpensive_restaurant: number
  meal_midrange_restaurant_for2: number
  mcmeal: number
  domestic_beer_draught: number
  imported_beer_bottle: number
  cappuccino: number
  wine_bottle_midrange: number
  milk_1L: number
  bread_500g: number
  eggs_12: number
  chicken_1kg: number
  transport_monthly_pass: number
  mobile_tariff_per_min: number
  tennis_court_1hr: number
  utilities_monthly_85m2: number
  internet_60mbps_monthly: number
  rent_1br_outside_centre: number
  rent_1br_city_centre: number
  rent_3br_outside_centre: number
  avg_monthly_net_salary: number
  gym_monthly: number
  cinema_ticket: number
  gasoline_1L: number
  data_quality: number
}

export type MapCity = CityData & {
  id: string
  lat: number
  lng: number
}

const CITY_DATA_FIELDS: (keyof CityData)[] = [
  'city',
  'country',
  'meal_inexpensive_restaurant',
  'meal_midrange_restaurant_for2',
  'mcmeal',
  'domestic_beer_draught',
  'imported_beer_bottle',
  'cappuccino',
  'wine_bottle_midrange',
  'milk_1L',
  'bread_500g',
  'eggs_12',
  'chicken_1kg',
  'transport_monthly_pass',
  'mobile_tariff_per_min',
  'tennis_court_1hr',
  'utilities_monthly_85m2',
  'internet_60mbps_monthly',
  'rent_1br_outside_centre',
  'rent_1br_city_centre',
  'rent_3br_outside_centre',
  'avg_monthly_net_salary',
  'gym_monthly',
  'cinema_ticket',
  'gasoline_1L',
  'data_quality',
]

function buildColumnIndex(headerLine: string): Record<string, number> {
  return Object.fromEntries(
    headerLine
      .trim()
      .split(',')
      .map((name, index) => [name.replace(/\r$/, ''), index]),
  )
}

const CSV_COLUMN_INDEX = buildColumnIndex(csvRaw.split('\n')[0] ?? '')

function parseNumber(value: string | undefined): number {
  const n = Number((value ?? '0').replace(/\r/g, ''))
  return Number.isFinite(n) ? n : 0
}

function parseCityRow(parts: string[]): CityData {
  const row = {} as CityData
  for (const field of CITY_DATA_FIELDS) {
    const idx = CSV_COLUMN_INDEX[field]
    const raw = parts[idx] ?? '0'
    if (field === 'city' || field === 'country') {
      row[field] = raw.replace(/\r/g, '')
    } else {
      row[field] = parseNumber(raw)
    }
  }
  return row
}

function cityKey(city: string, country: string): string {
  return `${city}|${country}`
}

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase()
}

/** Omitted from map, lists, and counts — applied when city rows are first loaded. */
export const EXCLUDED_COUNTRIES = [
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
] as const

/** Shown with travel-advisory badge; can be hidden via map filters. */
export const TRAVEL_ADVISORY_COUNTRIES = ['Venezuela', 'Nicaragua'] as const

const EXCLUDED_COUNTRY_KEYS = new Set(
  EXCLUDED_COUNTRIES.map((c) => normalizeLookup(c)),
)

const TRAVEL_ADVISORY_COUNTRY_KEYS = new Set(
  TRAVEL_ADVISORY_COUNTRIES.map((c) => normalizeLookup(c)),
)

export function isExcludedCountry(country: string): boolean {
  return EXCLUDED_COUNTRY_KEYS.has(normalizeLookup(country))
}

export function hasTravelAdvisory(country: string): boolean {
  return TRAVEL_ADVISORY_COUNTRY_KEYS.has(normalizeLookup(country))
}

let cachedCities: CityData[] | null = null
let cachedMapCities: MapCity[] | null = null

function loadAllCityRows(): CityData[] {
  if (cachedCities) return cachedCities
  const lines = csvRaw.trim().split('\n').slice(1)
  cachedCities = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => parseCityRow(line.split(',')))
    .filter((row) => !isExcludedCountry(row.country))
  return cachedCities
}

function coordsFor(city: string, country: string): { lat: number; lng: number } | null {
  const hit = cityCoordinates[cityKey(city, country) as keyof typeof cityCoordinates]
  return hit ?? null
}

export function getAllCities(): CityData[] {
  return loadAllCityRows()
}

export function getCityData(city: string, country?: string): CityData | null {
  const targetCity = normalizeLookup(city)
  const targetCountry = country ? normalizeLookup(country) : null

  const matches = loadAllCityRows().filter((row) => {
    if (normalizeLookup(row.city) !== targetCity) return false
    if (targetCountry && normalizeLookup(row.country) !== targetCountry) return false
    return true
  })

  if (!matches.length) return null
  if (matches.length === 1) return matches[0]

  if (targetCountry) {
    return matches.find((row) => normalizeLookup(row.country) === targetCountry) ?? matches[0]
  }

  return matches[0]
}

export function getAllMapCities(): MapCity[] {
  if (cachedMapCities) return cachedMapCities

  cachedMapCities = loadAllCityRows()
    .filter((row) => row.rent_1br_outside_centre > 0)
    .map((row) => {
      const coords = coordsFor(row.city, row.country)
      if (!coords) return null
      return {
        ...row,
        id: cityKey(row.city, row.country),
        lat: coords.lat,
        lng: coords.lng,
      }
    })
    .filter((row): row is MapCity => row != null)

  return cachedMapCities
}

export function calculateMonthlyBudget(city: CityData): number {
  const food = city.meal_inexpensive_restaurant * 45
  const transport = city.transport_monthly_pass
  const utilities = city.utilities_monthly_85m2
  const internet = city.internet_60mbps_monthly
  const rent = city.rent_1br_outside_centre
  return Math.round(food + transport + utilities + internet + rent)
}

export function calculateAffordabilityScore(city: CityData, monthlyIncome: number): number {
  const budget = calculateMonthlyBudget(city)
  if (budget <= 0 || monthlyIncome <= 0) return 0
  return Math.min(100, Math.round((monthlyIncome / budget) * 60))
}

export function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export function formatUsdOrDash(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—'
  return formatUsd(n)
}

export function countryToFlagEmoji(country: string): string {
  const iso = countryToIsoCode(country)
  if (!iso || iso.length !== 2) return '🌍'
  const codePoints = [...iso.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

export function countryToIsoCode(country: string): string | null {
  return COUNTRY_ISO[country] ?? null
}

export function countryToCurrencyCode(country: string): string | null {
  const iso = countryToIsoCode(country)
  if (!iso) return null
  return ISO_TO_CURRENCY[iso] ?? null
}

const ISO_TO_CURRENCY: Record<string, string> = {
  AE: 'AED',
  AL: 'ALL',
  AM: 'AMD',
  AR: 'ARS',
  AT: 'EUR',
  AU: 'AUD',
  AZ: 'AZN',
  BA: 'BAM',
  BD: 'BDT',
  BE: 'EUR',
  BG: 'BGN',
  BH: 'BHD',
  BO: 'BOB',
  BR: 'BRL',
  BW: 'BWP',
  BY: 'BYN',
  CA: 'CAD',
  CH: 'CHF',
  CI: 'XOF',
  CL: 'CLP',
  CM: 'XAF',
  CN: 'CNY',
  CO: 'COP',
  CR: 'CRC',
  CU: 'CUP',
  CY: 'EUR',
  CZ: 'CZK',
  DE: 'EUR',
  DK: 'DKK',
  DO: 'DOP',
  DZ: 'DZD',
  EC: 'USD',
  EE: 'EUR',
  EG: 'EGP',
  ES: 'EUR',
  ET: 'ETB',
  FI: 'EUR',
  FR: 'EUR',
  GB: 'GBP',
  GE: 'GEL',
  GH: 'GHS',
  GR: 'EUR',
  GT: 'GTQ',
  HK: 'HKD',
  HN: 'HNL',
  HR: 'EUR',
  HU: 'HUF',
  ID: 'IDR',
  IE: 'EUR',
  IL: 'ILS',
  IN: 'INR',
  IQ: 'IQD',
  IR: 'IRR',
  IS: 'ISK',
  IT: 'EUR',
  JM: 'JMD',
  JO: 'JOD',
  JP: 'JPY',
  KE: 'KES',
  KH: 'KHR',
  KR: 'KRW',
  KW: 'KWD',
  KZ: 'KZT',
  LA: 'LAK',
  LB: 'LBP',
  LK: 'LKR',
  LT: 'EUR',
  LU: 'EUR',
  LV: 'EUR',
  MA: 'MAD',
  MD: 'MDL',
  ME: 'EUR',
  MK: 'MKD',
  MM: 'MMK',
  MN: 'MNT',
  MT: 'EUR',
  MU: 'MUR',
  MX: 'MXN',
  MY: 'MYR',
  MZ: 'MZN',
  NA: 'NAD',
  NG: 'NGN',
  NI: 'NIO',
  NL: 'EUR',
  NO: 'NOK',
  NP: 'NPR',
  NZ: 'NZD',
  OM: 'OMR',
  PA: 'USD',
  PE: 'PEN',
  PH: 'PHP',
  PK: 'PKR',
  PL: 'PLN',
  PR: 'USD',
  PT: 'EUR',
  PY: 'PYG',
  QA: 'QAR',
  RO: 'RON',
  RS: 'RSD',
  RU: 'RUB',
  SA: 'SAR',
  SE: 'SEK',
  SG: 'SGD',
  SI: 'EUR',
  SK: 'EUR',
  SN: 'XOF',
  SV: 'USD',
  SY: 'SYP',
  TH: 'THB',
  TN: 'TND',
  TR: 'TRY',
  TT: 'TTD',
  TW: 'TWD',
  TZ: 'TZS',
  UA: 'UAH',
  UG: 'UGX',
  US: 'USD',
  UY: 'UYU',
  UZ: 'UZS',
  VE: 'VES',
  VN: 'VND',
  XK: 'EUR',
  ZA: 'ZAR',
  ZM: 'ZMW',
  ZW: 'ZWG',
}

const COUNTRY_ISO: Record<string, string> = {
  'South Korea': 'KR',
  'United States': 'US',
  'United Kingdom': 'GB',
  'Czech Republic': 'CZ',
  'Dominican Republic': 'DO',
  'Costa Rica': 'CR',
  'New Zealand': 'NZ',
  'South Africa': 'ZA',
  'United Arab Emirates': 'AE',
  'Hong Kong': 'HK',
  Taiwan: 'TW',
  Russia: 'RU',
  Vietnam: 'VN',
  Turkey: 'TR',
  Iran: 'IR',
  Syria: 'SY',
  'North Macedonia': 'MK',
  'Bosnia And Herzegovina': 'BA',
  'Trinidad And Tobago': 'TT',
  'Sri Lanka': 'LK',
  'Puerto Rico': 'PR',
  "Côte d'Ivoire": 'CI',
  'El Salvador': 'SV',
  'Saudi Arabia': 'SA',
  China: 'CN',
  India: 'IN',
  Brazil: 'BR',
  Canada: 'CA',
  Mexico: 'MX',
  Japan: 'JP',
  Germany: 'DE',
  France: 'FR',
  Italy: 'IT',
  Spain: 'ES',
  Portugal: 'PT',
  Netherlands: 'NL',
  Belgium: 'BE',
  Switzerland: 'CH',
  Austria: 'AT',
  Poland: 'PL',
  Sweden: 'SE',
  Norway: 'NO',
  Denmark: 'DK',
  Finland: 'FI',
  Ireland: 'IE',
  Greece: 'GR',
  Hungary: 'HU',
  Romania: 'RO',
  Bulgaria: 'BG',
  Croatia: 'HR',
  Serbia: 'RS',
  Ukraine: 'UA',
  Israel: 'IL',
  Egypt: 'EG',
  Morocco: 'MA',
  Tunisia: 'TN',
  Algeria: 'DZ',
  Kenya: 'KE',
  Nigeria: 'NG',
  Ghana: 'GH',
  Ethiopia: 'ET',
  Tanzania: 'TZ',
  Uganda: 'UG',
  Zimbabwe: 'ZW',
  Zambia: 'ZM',
  Mozambique: 'MZ',
  Namibia: 'NA',
  Botswana: 'BW',
  Mauritius: 'MU',
  Australia: 'AU',
  Indonesia: 'ID',
  Thailand: 'TH',
  Malaysia: 'MY',
  Singapore: 'SG',
  Philippines: 'PH',
  Pakistan: 'PK',
  Bangladesh: 'BD',
  Nepal: 'NP',
  Cambodia: 'KH',
  Laos: 'LA',
  Myanmar: 'MM',
  Mongolia: 'MN',
  Kazakhstan: 'KZ',
  Uzbekistan: 'UZ',
  Azerbaijan: 'AZ',
  Georgia: 'GE',
  Armenia: 'AM',
  Qatar: 'QA',
  Kuwait: 'KW',
  Bahrain: 'BH',
  Oman: 'OM',
  Jordan: 'JO',
  Lebanon: 'LB',
  Iraq: 'IQ',
  Colombia: 'CO',
  Argentina: 'AR',
  Chile: 'CL',
  Peru: 'PE',
  Ecuador: 'EC',
  Bolivia: 'BO',
  Paraguay: 'PY',
  Uruguay: 'UY',
  Venezuela: 'VE',
  Panama: 'PA',
  Guatemala: 'GT',
  Honduras: 'HN',
  Nicaragua: 'NI',
  Cuba: 'CU',
  Jamaica: 'JM',
  Iceland: 'IS',
  Luxembourg: 'LU',
  Slovakia: 'SK',
  Slovenia: 'SI',
  Lithuania: 'LT',
  Latvia: 'LV',
  Estonia: 'EE',
  Moldova: 'MD',
  Belarus: 'BY',
  Cyprus: 'CY',
  Malta: 'MT',
  Albania: 'AL',
  Montenegro: 'ME',
  Kosovo: 'XK',
  Cameroon: 'CM',
  Senegal: 'SN',
  'Ivory Coast': 'CI',
}
