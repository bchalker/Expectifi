export type ClimatePreference = 'warm' | 'mild' | 'four-seasons'
export type BudgetRange = 'under-2k' | '2-3k' | '3-5k' | '5k-plus'
export type DestinationRegion = 'europe' | 'latin-america' | 'southeast-asia' | 'other'

export type StaticGauge = {
  score: number
  explanation: string
}

export type CuratedDestination = {
  id: string
  name: string
  regionLabel: string
  countryCode: string
  flagEmoji: string
  lat: number
  lng: number
  description: string
  climate: ClimatePreference
  budgetTier: BudgetRange
  region: DestinationRegion
  avgExpatCostUsd: number
  gauges: {
    climate: StaticGauge
    healthcare: StaticGauge
    visa: StaticGauge
    distanceFromUs: StaticGauge
    english: StaticGauge
  }
}

export const CURATED_RETIREMENT_DESTINATIONS: CuratedDestination[] = [
  d('lisbon', 'Lisbon', 'Portugal', 'PT', '🇵🇹', 38.7223, -9.1393, 'warm', '2-3k', 'europe', 2400,
    'Mild Atlantic winters and long sunny seasons make Lisbon a walkable, café-rich base. Expats enjoy strong healthcare, Atlantic beaches, and a slower pace without leaving Europe.',
    { climate: 82, healthcare: 78, visa: 85, distanceFromUs: 55, english: 72 }),
  d('algarve', 'Algarve', 'Portugal', 'PT', '🇵🇹', 37.0194, -7.9304, 'warm', '2-3k', 'europe', 2200,
    'Golden cliffs, golf courses, and fishing villages define the Algarve retirement lifestyle. It is one of Europe\'s sunniest coasts with a well-established English-speaking expat community.',
    { climate: 88, healthcare: 76, visa: 85, distanceFromUs: 52, english: 78 }),

  d('valencia', 'Valencia', 'Spain', 'ES', '🇪🇸', 39.4699, -0.3763, 'warm', '2-3k', 'europe', 2300,
    'Valencia pairs Mediterranean beaches with a compact historic center and excellent produce markets. Retirees appreciate the mild winters, tram network, and lower costs than Madrid or Barcelona.',
    { climate: 86, healthcare: 80, visa: 72, distanceFromUs: 50, english: 58 }),
  d('malaga', 'Málaga', 'Spain', 'ES', '🇪🇸', 36.7213, -4.4214, 'warm', '2-3k', 'europe', 2250,
    'Málaga sits on the Costa del Sol with near-year-round sunshine and an international airport. The city balances coastal relaxation with museums, healthcare, and a growing remote-worker scene.',
    { climate: 90, healthcare: 79, visa: 72, distanceFromUs: 48, english: 62 }),

  d('florence', 'Florence', 'Italy', 'IT', '🇮🇹', 43.7696, 11.2558, 'mild', '3-5k', 'europe', 3200,
    'Florence offers Renaissance art, hill-town day trips, and a food culture built around seasonal ingredients. Retirees who prioritize culture and cuisine accept higher housing costs in exchange.',
    { climate: 74, healthcare: 82, visa: 68, distanceFromUs: 58, english: 52 }),
  d('sicily', 'Sicily', 'Italy', 'IT', '🇮🇹', 38.1157, 13.3615, 'warm', '2-3k', 'europe', 2100,
    'Sicily delivers affordable seaside living, ancient ruins, and distinct regional cuisine. Smaller towns offer lower costs while still accessing Italian healthcare standards.',
    { climate: 87, healthcare: 75, visa: 68, distanceFromUs: 56, english: 48 }),

  d('merida', 'Mérida', 'Mexico', 'MX', '🇲🇽', 20.9674, -89.5926, 'warm', 'under-2k', 'latin-america', 1800,
    'Mérida is consistently ranked among the safest large cities in Mexico with colonial architecture and Yucatán culture. Healthcare and flights to the US Gulf Coast are readily available.',
    { climate: 92, healthcare: 70, visa: 88, distanceFromUs: 82, english: 45 }),
  d('san-miguel', 'San Miguel de Allende', 'Mexico', 'MX', '🇲🇽', 20.9144, -100.7452, 'mild', '2-3k', 'latin-america', 2500,
    'San Miguel draws artists and retirees to its cobblestone streets and highland climate. The large North American expat network makes settling in easier, though costs have risen with popularity.',
    { climate: 78, healthcare: 68, visa: 88, distanceFromUs: 85, english: 70 }),

  d('costa-rica', 'Central Valley', 'Costa Rica', 'CR', '🇨🇷', 9.9281, -84.0907, 'warm', '2-3k', 'latin-america', 2200,
    'Costa Rica\'s pensionado visa path and stable democracy attract eco-minded retirees. The Central Valley offers spring-like weather, private hospitals, and quick flights to Miami.',
    { climate: 84, healthcare: 74, visa: 90, distanceFromUs: 88, english: 55 }),

  d('panama', 'Panama City', 'Panama', 'PA', '🇵🇦', 8.9824, -79.5199, 'warm', '2-3k', 'latin-america', 2300,
    'Panama uses the US dollar and offers a straightforward pensionado visa for qualifying retirees. Panama City combines modern healthcare with easy access to beaches and highland towns.',
    { climate: 85, healthcare: 72, visa: 92, distanceFromUs: 90, english: 58 }),

  d('medellin', 'Medellín', 'Colombia', 'CO', '🇨🇴', 6.2476, -75.5658, 'mild', 'under-2k', 'latin-america', 1700,
    'Medellín\'s eternal-spring climate and metro system make it surprisingly livable for retirees on a budget. Private clinics are excellent; learning basic Spanish improves daily life.',
    { climate: 80, healthcare: 76, visa: 75, distanceFromUs: 78, english: 42 }),

  d('athens', 'Athens', 'Greece', 'GR', '🇬🇷', 37.9838, 23.7275, 'warm', '2-3k', 'europe', 2400,
    'Athens blends ancient history with a vibrant taverna culture and island ferry access. Greece\'s flat tax incentive for qualifying pensioners can improve after-tax income for new residents.',
    { climate: 83, healthcare: 74, visa: 70, distanceFromUs: 52, english: 55 }),
  d('crete', 'Crete', 'Greece', 'GR', '🇬🇷', 35.3387, 25.1442, 'warm', '2-3k', 'europe', 2100,
    'Crete offers village life, olive groves, and long Mediterranean summers at lower cost than Athens. Healthcare is adequate in cities; island logistics require planning for specialists.',
    { climate: 88, healthcare: 70, visa: 70, distanceFromUs: 50, english: 50 }),

  d('croatia', 'Split', 'Croatia', 'HR', '🇭🇷', 43.5081, 16.4402, 'mild', '2-3k', 'europe', 2300,
    'Split sits on the Adriatic with Roman ruins woven into a modern waterfront city. Croatia appeals to retirees seeking coastal Europe with lower prices than Italy or France.',
    { climate: 76, healthcare: 72, visa: 65, distanceFromUs: 48, english: 60 }),

  d('chiang-mai', 'Chiang Mai', 'Thailand', 'TH', '🇹🇭', 18.7883, 98.9853, 'warm', 'under-2k', 'southeast-asia', 1500,
    'Chiang Mai is Thailand\'s retiree hub with temples, night markets, and excellent street food. International hospitals and a low cost of base make it popular for budget-conscious expats.',
    { climate: 86, healthcare: 78, visa: 80, distanceFromUs: 25, english: 55 }),
  d('da-nang', 'Da Nang', 'Vietnam', 'VN', '🇻🇳', 16.0544, 108.2022, 'warm', 'under-2k', 'southeast-asia', 1400,
    'Da Nang combines beach living with a growing expat scene and improving healthcare. Vietnam\'s retirement visa path is evolving; costs remain among the lowest in the region.',
    { climate: 88, healthcare: 68, visa: 62, distanceFromUs: 22, english: 40 }),

  d('penang', 'Penang', 'Malaysia', 'MY', '🇲🇾', 5.4141, 100.3288, 'warm', 'under-2k', 'southeast-asia', 1600,
    'Penang offers hawker food, colonial architecture, and MM2H-style residency options (verify current rules). English is widely spoken and private healthcare is affordable by US standards.',
    { climate: 87, healthcare: 80, visa: 70, distanceFromUs: 28, english: 82 }),

  d('cuenca', 'Cuenca', 'Ecuador', 'EC', '🇪🇨', -2.9001, -79.0059, 'mild', 'under-2k', 'latin-america', 1500,
    'Cuenca is a UNESCO heritage city with spring-like highland weather and a large US expat community. Ecuador uses the US dollar and offers affordable clinics and assisted living options.',
    { climate: 79, healthcare: 65, visa: 82, distanceFromUs: 75, english: 38 }),

  d('montevideo', 'Montevideo', 'Uruguay', 'UY', '🇺🇾', -34.9011, -56.1645, 'mild', '2-3k', 'latin-america', 2400,
    'Uruguay is stable, progressive, and welcoming to foreign retirees with a straightforward residency process. Montevideo offers walkable neighborhoods, wine country nearby, and seasons opposite the US.',
    { climate: 72, healthcare: 76, visa: 85, distanceFromUs: 65, english: 45 }),

  d('wellington', 'Wellington', 'New Zealand', 'NZ', '🇳🇿', -41.2865, 174.7762, 'mild', '3-5k', 'other', 3400,
    'New Zealand delivers stunning nature, low corruption, and excellent public healthcare for residents. Wellington\'s culture and coffee scene appeal to active retirees who can meet higher living costs.',
    { climate: 68, healthcare: 88, visa: 55, distanceFromUs: 15, english: 95 }),
]

function d(
  id: string,
  name: string,
  regionLabel: string,
  countryCode: string,
  flagEmoji: string,
  lat: number,
  lng: number,
  climate: ClimatePreference,
  budgetTier: BudgetRange,
  region: DestinationRegion,
  avgExpatCostUsd: number,
  description: string,
  scores: { climate: number; healthcare: number; visa: number; distanceFromUs: number; english: number },
): CuratedDestination {
  return {
    id,
    name,
    regionLabel,
    countryCode,
    flagEmoji,
    lat,
    lng,
    description,
    climate,
    budgetTier,
    region,
    avgExpatCostUsd,
    gauges: {
      climate: {
        score: scores.climate,
        explanation: climateExplanation(scores.climate, climate),
      },
      healthcare: {
        score: scores.healthcare,
        explanation: healthcareExplanation(scores.healthcare),
      },
      visa: {
        score: scores.visa,
        explanation: visaExplanation(scores.visa),
      },
      distanceFromUs: {
        score: scores.distanceFromUs,
        explanation: distanceExplanation(scores.distanceFromUs),
      },
      english: {
        score: scores.english,
        explanation: englishExplanation(scores.english),
      },
    },
  }
}

function climateExplanation(score: number, type: ClimatePreference): string {
  const labels: Record<ClimatePreference, string> = {
    warm: 'Warm year-round with mild winters',
    mild: 'Mild seasons without extreme heat or cold',
    'four-seasons': 'Distinct seasons with comfortable shoulder months',
  }
  if (score >= 80) return `${labels[type]} — excellent climate fit for most retirees.`
  if (score >= 65) return `${labels[type]} — generally comfortable with seasonal variation.`
  return `${labels[type]} — consider personal heat/cold tolerance.`
}

function healthcareExplanation(score: number): string {
  if (score >= 80) return 'Strong private and public options; specialists readily available.'
  if (score >= 65) return 'Good urban hospitals; rural areas may require travel for care.'
  return 'Basic care available; complex cases may mean regional travel.'
}

function visaExplanation(score: number): string {
  if (score >= 85) return 'Clear retirement or pensionado pathways with reasonable income proof.'
  if (score >= 65) return 'Residency achievable with planning; rules change — verify before moving.'
  return 'Limited retiree-specific visas; consult an immigration attorney.'
}

function distanceExplanation(score: number): string {
  if (score >= 80) return 'Short flights to major US hubs — easy for family visits.'
  if (score >= 60) return 'One-stop flights common; plan for 8–12 hour travel days.'
  if (score >= 40) return 'Long-haul flights typical; fewer direct routes from the US.'
  return 'Very long distances — budget time and cost for US trips.'
}

function englishExplanation(score: number): string {
  if (score >= 80) return 'English widely spoken in daily life and services.'
  if (score >= 55) return 'English common in expat areas; local language helps daily errands.'
  return 'Limited English outside expat zones — plan for language learning.'
}
