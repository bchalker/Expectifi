import { formatYearMonthLabel } from '../utils/formatYearMonth'

/** Healthcare accessibility rating (0–100) for destination scoring. */
export const HEALTHCARE_RATINGS_LAST_REVIEWED = '2025-01'

export const DESTINATION_HEALTHCARE_RATINGS: Record<string, number> = {
  'state:AL': 72,
  'state:AK': 68,
  'state:AZ': 78,
  'state:AR': 70,
  'state:CA': 82,
  'state:CO': 80,
  'state:CT': 84,
  'state:DE': 78,
  'state:FL': 76,
  'state:GA': 74,
  'state:HI': 80,
  'state:ID': 72,
  'state:IL': 80,
  'state:IN': 74,
  'state:IA': 76,
  'state:KS': 74,
  'state:KY': 70,
  'state:LA': 68,
  'state:ME': 76,
  'state:MD': 82,
  'state:MA': 88,
  'state:MI': 78,
  'state:MN': 86,
  'state:MS': 64,
  'state:MO': 74,
  'state:MT': 72,
  'state:NE': 76,
  'state:NV': 72,
  'state:NH': 80,
  'state:NJ': 82,
  'state:NM': 70,
  'state:NY': 84,
  'state:NC': 76,
  'state:ND': 74,
  'state:OH': 78,
  'state:OK': 68,
  'state:OR': 80,
  'state:PA': 80,
  'state:RI': 78,
  'state:SC': 72,
  'state:SD': 74,
  'state:TN': 72,
  'state:TX': 74,
  'state:UT': 78,
  'state:VT': 80,
  'state:VA': 82,
  'state:WA': 82,
  'state:WV': 66,
  'state:WI': 80,
  'state:WY': 70,
  'state:DC': 86,
  'country:PT': 78,
  'country:ES': 82,
  'country:IT': 80,
  'country:MX': 62,
  'country:CR': 70,
  'country:PA': 68,
  'country:TH': 72,
  'country:GR': 74,
  'country:FR': 88,
  'country:DE': 86,
  'country:NL': 86,
  'country:IE': 84,
  'country:GB': 86,
  'country:CA': 84,
  'country:AU': 86,
  'country:NZ': 84,
  'country:JP': 90,
  'country:CO': 68,
  'country:EC': 64,
  'country:VN': 62,
  'country:PH': 58,
  'country:MY': 72,
  'country:UY': 74,
  'country:CL': 76,
}

const DEFAULT_RATING = 70

export function getHealthcareRating(key: string): number {
  return DESTINATION_HEALTHCARE_RATINGS[key] ?? DEFAULT_RATING
}

export function getHealthcareRatingsLastReviewed(): string {
  return HEALTHCARE_RATINGS_LAST_REVIEWED
}

export function healthcareRatingsLastReviewedMessage(): string {
  return `Healthcare ratings last reviewed ${formatYearMonthLabel(HEALTHCARE_RATINGS_LAST_REVIEWED)}.`
}
