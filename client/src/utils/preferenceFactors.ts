import type {
  CorePreferenceKey,
  DailyLifeFactorId,
  PreferenceStep,
} from '../types/preferences'
import { DAILY_LIFE_FACTOR_IDS } from '../types/preferences'

export type PreferenceFactorId = CorePreferenceKey | DailyLifeFactorId

export type PreferencePopoverId = PreferenceFactorId | `${PreferenceFactorId}:direction`

export function preferenceDirectionPopoverId(
  factorId: PreferenceFactorId,
): PreferencePopoverId {
  return `${factorId}:direction`
}

export type PreferenceLevelCopy = {
  badge: string
  sub: string
}

export type PreferenceFactorDefinition = {
  id: PreferenceFactorId
  icon: string
  label: string
  noun: string
  levels: PreferenceLevelCopy[]
  defaultStep: PreferenceStep
}

function buildLevels(
  zero: PreferenceLevelCopy,
  one: PreferenceLevelCopy,
  two: PreferenceLevelCopy,
  three: PreferenceLevelCopy,
  four: PreferenceLevelCopy,
  five: PreferenceLevelCopy,
): PreferenceLevelCopy[] {
  return [zero, one, two, three, four, five]
}

export const WIZARD_STEP_LABELS = [
  '',
  'Financial',
  'Safety & health',
  'Lifestyle & wellbeing',
  'Daily life',
  'Review & save',
] as const

export const STEP_1_FINANCIAL: CorePreferenceKey[] = [
  'affordability',
  'taxEfficiency',
  'healthcareCost',
]

export const STEP_2_SAFETY: CorePreferenceKey[] = [
  'safety',
  'healthcareQuality',
  'airQuality',
  'disasterRisk',
]

export const STEP_3_LIFESTYLE: CorePreferenceKey[] = [
  'climate',
  'politicalStability',
  'socialLaws',
]

export const STEP_4_DAILY: DailyLifeFactorId[] = [...DAILY_LIFE_FACTOR_IDS]

export const PREFERENCE_FACTOR_DEFINITIONS: Record<PreferenceFactorId, PreferenceFactorDefinition> = {
  affordability: {
    id: 'affordability',
    icon: 'coin',
    label: 'Affordability',
    noun: 'affordability',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Cost of living won't influence your score" },
      { badge: 'Nice to have', sub: 'Slightly prefer where money goes further' },
      { badge: 'Budget-conscious', sub: "I'd like my income to cover costs comfortably" },
      { badge: 'Value matters', sub: 'I want meaningful surplus after expenses' },
      { badge: 'Stretch my income', sub: 'I need my dollar to go as far as possible' },
      { badge: 'Make or break', sub: 'Unaffordable destinations are eliminated' },
    ),
  },
  taxEfficiency: {
    id: 'taxEfficiency',
    icon: 'receipt-tax',
    label: 'Tax efficiency',
    noun: 'tax efficiency',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Tax burden won't influence your score" },
      { badge: 'Low concern', sub: "I'll work with the local situation" },
      { badge: 'Some weight', sub: 'Prefer reasonable tax treatment' },
      { badge: 'Important', sub: 'Tax efficiency affects my retirement income' },
      { badge: 'High priority', sub: 'I want to minimize tax drag' },
      { badge: 'Must be efficient', sub: "High-tax destinations don't work for me" },
    ),
  },
  healthcareCost: {
    id: 'healthcareCost',
    icon: 'file-invoice',
    label: 'Healthcare insurance cost',
    noun: 'affordable healthcare insurance',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Insurance cost won't affect score" },
      { badge: 'Minor', sub: 'I have coverage sorted already' },
      { badge: 'Some weight', sub: "I'd prefer lower insurance costs" },
      { badge: 'Important', sub: 'Insurance cost meaningfully affects my monthly budget' },
      {
        badge: 'High priority',
        sub: 'I need affordable private coverage to make the numbers work',
      },
      {
        badge: 'Must be affordable',
        sub: 'Countries where insurance eats my budget are eliminated',
      },
    ),
  },
  safety: {
    id: 'safety',
    icon: 'shield-check',
    label: 'Safety',
    noun: 'safety',
    defaultStep: 5,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Safety won't influence your score" },
      { badge: 'Minor concern', sub: "I'm comfortable in most environments" },
      { badge: 'Prefer safe', sub: "I'd rather avoid high-crime areas" },
      { badge: 'Important to me', sub: 'Safety is a meaningful part of retirement quality' },
      { badge: 'High priority', sub: 'I want to feel genuinely safe day-to-day' },
      { badge: 'Non-negotiable', sub: 'I need to feel completely safe wherever I live' },
    ),
  },
  healthcareQuality: {
    id: 'healthcareQuality',
    icon: 'heart-rate-monitor',
    label: 'Healthcare quality',
    noun: 'healthcare quality',
    defaultStep: 4,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Healthcare won't influence your score" },
      { badge: 'Low concern', sub: 'I maintain private coverage' },
      { badge: 'Some weight', sub: 'Decent hospitals matter' },
      { badge: 'Important', sub: 'I want quality care without going far' },
      { badge: 'High priority', sub: 'Healthcare is central to my retirement plan' },
      { badge: 'Non-negotiable', sub: 'Poor healthcare is a dealbreaker for me' },
    ),
  },
  airQuality: {
    id: 'airQuality',
    icon: 'wind',
    label: 'Air quality',
    noun: 'clean air and low pollution',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Air quality won't affect your score" },
      { badge: 'Minor', sub: 'I can manage in most environments' },
      { badge: 'Some weight', sub: "I'd prefer to avoid heavily polluted cities" },
      { badge: 'Important', sub: 'Clean air matters to my daily comfort and health' },
      {
        badge: 'High priority',
        sub: 'Poor air quality would significantly affect my wellbeing',
      },
      { badge: 'Non-negotiable', sub: 'High pollution cities are a dealbreaker for my health' },
    ),
  },
  disasterRisk: {
    id: 'disasterRisk',
    icon: 'alert-triangle',
    label: 'Natural disaster risk',
    noun: 'low natural disaster risk',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Disaster risk won't affect score" },
      { badge: 'Minor', sub: 'I accept some natural risk' },
      { badge: 'Some weight', sub: "I'd prefer lower-risk regions" },
      {
        badge: 'Important',
        sub: 'Earthquake, flood, or hurricane risk matters to my sense of security',
      },
      { badge: 'High priority', sub: 'I want low natural disaster exposure' },
      { badge: 'Non-negotiable', sub: 'High disaster risk countries are eliminated' },
    ),
  },
  climate: {
    id: 'climate',
    icon: 'sun',
    label: 'Climate',
    noun: 'climate',
    defaultStep: 2,
    levels: buildLevels(
      { badge: 'No preference', sub: "Climate won't influence your score" },
      { badge: 'Slight preference', sub: 'Mildly prefer comfortable weather' },
      { badge: 'Matters some', sub: "I'd like to avoid extremes" },
      { badge: 'Counts for me', sub: 'Good weather improves my daily life' },
      { badge: 'Love mild warmth', sub: 'Mediterranean or dry warmth is a top draw' },
      { badge: 'Must be comfortable', sub: 'Tropical humidity or harsh winters are dealbreakers' },
    ),
  },
  politicalStability: {
    id: 'politicalStability',
    icon: 'building-bank',
    label: 'Political stability',
    noun: 'political stability and governance',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Political climate won't affect your score" },
      { badge: 'Minor', sub: 'I can adapt to some instability' },
      { badge: 'Some weight', sub: "I'd prefer a stable political environment" },
      {
        badge: 'Important',
        sub: 'Stable governance matters for long-term residency confidence',
      },
      {
        badge: 'High priority',
        sub: 'I need to feel confident the country is stable and my residency is secure',
      },
      { badge: 'Non-negotiable', sub: 'Politically unstable countries are eliminated' },
    ),
  },
  socialLaws: {
    id: 'socialLaws',
    icon: 'scale',
    label: 'Social & religious laws',
    noun: 'social freedom and secular laws',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Social laws won't affect score" },
      { badge: 'Minor', sub: 'I can adapt to most social environments' },
      { badge: 'Some weight', sub: "I'd prefer fewer restrictions" },
      {
        badge: 'Important',
        sub: 'Alcohol access, dress norms, and personal freedoms matter to my daily lifestyle',
      },
      {
        badge: 'High priority',
        sub: 'I want open secular social norms — strict religious laws would significantly limit my lifestyle',
      },
      {
        badge: 'Non-negotiable',
        sub: "Countries with strict religious laws, alcohol bans, or enforced dress codes don't work for me",
      },
    ),
  },
  english: {
    id: 'english',
    icon: 'message-language',
    label: 'English spoken',
    noun: 'English being spoken',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Language won't influence score" },
      { badge: 'Nice to have', sub: 'A little English goes a long way' },
      { badge: 'Helpful', sub: 'I can get by in English most places' },
      { badge: 'Important', sub: 'Day-to-day English matters to my comfort' },
      { badge: 'Really matters', sub: 'I rely on English for most interactions' },
      { badge: 'Required', sub: "Places without English don't work for me" },
    ),
  },
  expat: {
    id: 'expat',
    icon: 'users',
    label: 'Expat community',
    noun: 'a strong expat community',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Expat presence won't influence score" },
      { badge: 'Minor bonus', sub: 'A small expat scene is a nice-to-have' },
      { badge: 'Some weight', sub: "I'd like to know other expats are around" },
      { badge: 'Important', sub: 'Community matters — I want to find my people' },
      { badge: 'High priority', sub: 'A large expat community is important' },
      { badge: 'Essential', sub: 'I need a strong expat presence' },
    ),
  },
  residency: {
    id: 'residency',
    icon: 'id-badge',
    label: 'Easy residency',
    noun: 'easy residency and visa access',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Visa requirements won't influence score" },
      { badge: 'Minor', sub: 'Some paperwork is fine' },
      { badge: 'Some weight', sub: 'Prefer a clear path to stay' },
      {
        badge: 'Important',
        sub: 'I want residency achievable within 1–2 years with a clear path to permanent status',
      },
      {
        badge: 'High priority',
        sub: 'I need minimal bureaucracy and a realistic 5-year path to permanent residency',
      },
      { badge: 'Must be easy', sub: 'No clear retirement visa path is a dealbreaker' },
    ),
  },
  walkability: {
    id: 'walkability',
    icon: 'walk',
    label: 'Walkability',
    noun: 'walkability',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Walkability won't affect score" },
      { badge: 'Minor', sub: "I'm fine driving or using transit" },
      { badge: 'Some weight', sub: "I'd prefer to run errands without a car" },
      { badge: 'Important', sub: 'Walkable neighborhoods matter to my lifestyle' },
      { badge: 'High priority', sub: 'I want to walk nearly everywhere I go' },
      { badge: 'Essential', sub: "Car-dependent cities don't work for me" },
    ),
  },
  publicTransport: {
    id: 'publicTransport',
    icon: 'bus',
    label: 'Public transportation',
    noun: 'reliable public transportation',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Transit won't affect your score" },
      { badge: 'Minor', sub: "I'll likely have a car or use taxis" },
      { badge: 'Some weight', sub: 'Occasional transit access is convenient' },
      { badge: 'Important', sub: "I'd like to get around without owning a car most of the time" },
      {
        badge: 'High priority',
        sub: 'Good public transit is central to how I want to live',
      },
      { badge: 'Essential', sub: "I won't own a car — reliable transit is non-negotiable" },
    ),
  },
  internet: {
    id: 'internet',
    icon: 'wifi',
    label: 'Internet & connectivity',
    noun: 'fast and reliable internet',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Connectivity won't affect score" },
      { badge: 'Minor', sub: 'Basic internet is enough for me' },
      { badge: 'Some weight', sub: 'Reliable broadband matters' },
      { badge: 'Important', sub: 'I need solid internet for video calls and streaming' },
      { badge: 'High priority', sub: 'Fast reliable internet is essential to my daily life' },
      { badge: 'Must have', sub: 'Slow or unreliable internet is a dealbreaker' },
    ),
  },
  food: {
    id: 'food',
    icon: 'tools-kitchen-2',
    label: 'Food & dining',
    noun: 'food and dining culture',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Food scene won't affect score" },
      { badge: 'Minor', sub: 'I eat simply and am happy anywhere' },
      { badge: 'Some weight', sub: 'I enjoy good food when available' },
      { badge: 'Important', sub: 'A quality food scene enriches my daily life' },
      { badge: 'High priority', sub: 'Cuisine variety and quality really matter to me' },
      { badge: 'Passion', sub: "Food culture is central to how I'd choose where to live" },
    ),
  },
  distanceFromUS: {
    id: 'distanceFromUS',
    icon: 'plane',
    label: 'Distance from home',
    noun: 'proximity to the US for family visits',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Distance won't affect your score" },
      { badge: 'Minor', sub: "I don't mind long flights occasionally" },
      { badge: 'Some weight', sub: "I'd prefer not to be too far from family" },
      {
        badge: 'Important',
        sub: 'Being able to visit family within a reasonable flight matters',
      },
      { badge: 'High priority', sub: 'I want to be within 8 hours of the US — closer is better' },
      { badge: 'Must be close', sub: 'Very long flights to visit family are a dealbreaker' },
    ),
  },
  languageCurve: {
    id: 'languageCurve',
    icon: 'language',
    label: 'Language learning curve',
    noun: 'an approachable language barrier',
    defaultStep: 3,
    levels: buildLevels(
      { badge: 'Not a factor', sub: "Language difficulty won't affect your score" },
      { badge: 'Minor', sub: 'I enjoy a language challenge' },
      { badge: 'Some weight', sub: "I'd prefer a language that's not too hard to pick up" },
      {
        badge: 'Important',
        sub: 'Being able to learn the basics within a year matters to feeling at home',
      },
      {
        badge: 'High priority',
        sub: 'I want a language reasonably accessible for an English speaker',
      },
      {
        badge: 'Must be approachable',
        sub: 'Very difficult or non-Latin script languages are a dealbreaker',
      },
    ),
  },
}

export function getFactorDefinition(id: PreferenceFactorId): PreferenceFactorDefinition {
  return PREFERENCE_FACTOR_DEFINITIONS[id]
}

export function getFactorLevelCopy(id: PreferenceFactorId, step: PreferenceStep): PreferenceLevelCopy {
  return PREFERENCE_FACTOR_DEFINITIONS[id].levels[step] ?? PREFERENCE_FACTOR_DEFINITIONS[id].levels[0]
}

export type PreferenceStepClass = `step-${PreferenceStep}`

export function preferenceStepClass(step: PreferenceStep): PreferenceStepClass {
  return `step-${step}`
}

export function truncateHelper(text: string, maxLen = 44): string {
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen - 1).trimEnd()}…`
}

export function isCorePreferenceKey(id: PreferenceFactorId): id is CorePreferenceKey {
  return !(DAILY_LIFE_FACTOR_IDS as readonly string[]).includes(id)
}

export const ALL_CORE_KEYS: CorePreferenceKey[] = [
  ...STEP_1_FINANCIAL,
  ...STEP_2_SAFETY,
  ...STEP_3_LIFESTYLE,
]
