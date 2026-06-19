export type SmokeRegion = 'mainland' | 'maritime'
export type SmokeSeverity = 'moderate' | 'severe' | 'variable'

export interface SmokeSeasonInfo {
  region: SmokeRegion
  peakMonths: number[]
  fullRange: { startMonth: number; endMonth: number }
  severity: SmokeSeverity
  source: string
  note: string
}

function mainlandSevere(note: string): SmokeSeasonInfo {
  return {
    region: 'mainland',
    peakMonths: [3],
    fullRange: { startMonth: 2, endMonth: 4 },
    severity: 'severe',
    source: 'agricultural burning',
    note,
  }
}

function mainlandModerate(note: string): SmokeSeasonInfo {
  return {
    region: 'mainland',
    peakMonths: [3],
    fullRange: { startMonth: 2, endMonth: 4 },
    severity: 'moderate',
    source: 'agricultural burning',
    note,
  }
}

function maritimeVariable(note: string): SmokeSeasonInfo {
  return {
    region: 'maritime',
    peakMonths: [9, 10],
    fullRange: { startMonth: 7, endMonth: 10 },
    severity: 'variable',
    source: 'peatland fires',
    note,
  }
}

function maritimeSevere(note: string, peakMonths = [9, 10]): SmokeSeasonInfo {
  return {
    region: 'maritime',
    peakMonths,
    fullRange: { startMonth: 7, endMonth: 10 },
    severity: 'severe',
    source: 'peatland fires',
    note,
  }
}

/** Keyed by MapCity.id — `${city}|${country}` from costOfLiving cityKey(). */
export const smokeSeasonByCity: Record<string, SmokeSeasonInfo> = {
  // Thailand — mainland burning season
  'Bangkok|Thailand': mainlandModerate(
    'Seasonal haze from northern agricultural burning drifts south, peaking in March.',
  ),
  'Chiang Mai|Thailand': mainlandSevere(
    'Peak in March from agricultural burning. Among the worst air quality in the world during this period.',
  ),
  'Chiang Rai|Thailand': mainlandSevere(
    'Severe haze from cross-border agricultural burning, worst in March.',
  ),
  'Hua Hin|Thailand': mainlandModerate(
    'Less intense than the north, but regional burning can still bring hazy skies in spring.',
  ),
  'Phuket|Thailand': mainlandModerate(
    'Southern Thailand sees lighter haze than the north, but smoke can still reach the Andaman coast in March.',
  ),

  // Laos
  'Luang Prabang|Laos': mainlandSevere(
    'Annual burning season brings heavy haze, peaking in March.',
  ),
  'Vientiane|Laos': mainlandModerate(
    'Seasonal haze from regional agricultural burning, peaking in March.',
  ),

  // Vietnam
  'Hanoi|Vietnam': {
    region: 'mainland',
    peakMonths: [2, 3],
    fullRange: { startMonth: 1, endMonth: 4 },
    severity: 'moderate',
    source: 'agricultural burning',
    note: 'Periodic haze from regional burning, worse in late winter and early spring.',
  },
  'Ho Chi Minh City|Vietnam': mainlandModerate(
    'Northern burning season haze is less common here, but dry-season smoke can still affect air quality in spring.',
  ),

  // Myanmar
  'Yangon|Myanmar': mainlandModerate(
    'Seasonal haze from agricultural burning, peaking in March.',
  ),
  'Mandalay|Myanmar': mainlandSevere(
    'Heavy seasonal haze from regional burning, peaking in March.',
  ),

  // Maritime Southeast Asia — peatland haze
  'Singapore|Singapore': maritimeVariable(
    'Severity depends heavily on El Niño dry years and Sumatra fire activity.',
  ),
  'Kuala Lumpur|Malaysia': maritimeVariable(
    'Haze severity varies year to year with Sumatra and Kalimantan fire activity.',
  ),
  'Johor Bahru|Malaysia': maritimeVariable(
    'Haze severity varies year to year with Sumatra and Kalimantan fire activity.',
  ),
  'Klang|Malaysia': maritimeVariable(
    'Haze severity varies year to year with Sumatra and Kalimantan fire activity.',
  ),
  'Petaling Jaya|Malaysia': maritimeVariable(
    'Haze severity varies year to year with Sumatra and Kalimantan fire activity.',
  ),
  'Shah Alam|Malaysia': maritimeVariable(
    'Haze severity varies year to year with Sumatra and Kalimantan fire activity.',
  ),
  'Kota Kinabalu|Malaysia': maritimeVariable(
    'Affected by Kalimantan peatland fires, especially in dry El Niño years.',
  ),
  'Kuching|Malaysia': maritimeVariable(
    'Affected by Kalimantan peatland fires across the border, worst in dry years.',
  ),
  'Jakarta|Indonesia': maritimeVariable(
    'Affected by regional peatland fires, worst in dry El Niño years.',
  ),
  'Tangerang|Indonesia': maritimeVariable(
    'Greater Jakarta metro is affected by regional peatland fires, worst in dry El Niño years.',
  ),
  'Bandung|Indonesia': maritimeVariable(
    'West Java sees variable haze from Sumatra peatland fires, worst in dry years.',
  ),
  'Surabaya|Indonesia': maritimeVariable(
    'East Java can see haze from regional fires, especially in dry El Niño years.',
  ),
  'Yogyakarta|Indonesia': maritimeVariable(
    'Central Java is affected by regional peatland fires, worst in dry El Niño years.',
  ),
  'Denpasar|Indonesia': maritimeVariable(
    'Bali can see haze from distant Sumatra and Kalimantan fires during severe haze years.',
  ),
  'Pekanbaru|Indonesia': maritimeSevere(
    'Near the epicenter of Sumatra peatland fires, severe haze most years.',
    [8, 9, 10],
  ),
  'Medan|Indonesia': maritimeSevere(
    'Heavy seasonal haze from nearby Sumatra peatland and plantation fires.',
  ),
}

export function getSmokeSeasonForCity(cityId: string): SmokeSeasonInfo | null {
  return smokeSeasonByCity[cityId] ?? null
}
