/** ISO 3166-1 numeric → alpha-2 for catalog countries on the world map. */
export const ISO_NUMERIC_TO_ALPHA2: Record<string, string> = {
  '36': 'AU',
  '124': 'CA',
  '152': 'CL',
  '170': 'CO',
  '188': 'CR',
  '218': 'EC',
  '250': 'FR',
  '276': 'DE',
  '300': 'GR',
  '380': 'IT',
  '392': 'JP',
  '458': 'MY',
  '484': 'MX',
  '554': 'NZ',
  '591': 'PA',
  '608': 'PH',
  '620': 'PT',
  '704': 'VN',
  '724': 'ES',
  '764': 'TH',
  '826': 'GB',
  '858': 'UY',
}

/** US state FIPS → postal abbreviation for the US inset map. */
export const FIPS_TO_STATE: Record<string, string> = {
  '01': 'AL',
  '02': 'AK',
  '04': 'AZ',
  '05': 'AR',
  '06': 'CA',
  '08': 'CO',
  '09': 'CT',
  '10': 'DE',
  '11': 'DC',
  '12': 'FL',
  '13': 'GA',
  '15': 'HI',
  '16': 'ID',
  '17': 'IL',
  '18': 'IN',
  '19': 'IA',
  '20': 'KS',
  '21': 'KY',
  '22': 'LA',
  '23': 'ME',
  '24': 'MD',
  '25': 'MA',
  '26': 'MI',
  '27': 'MN',
  '28': 'MS',
  '29': 'MO',
  '30': 'MT',
  '31': 'NE',
  '32': 'NV',
  '33': 'NH',
  '34': 'NJ',
  '35': 'NM',
  '36': 'NY',
  '37': 'NC',
  '38': 'ND',
  '39': 'OH',
  '40': 'OK',
  '41': 'OR',
  '42': 'PA',
  '44': 'RI',
  '45': 'SC',
  '46': 'SD',
  '47': 'TN',
  '48': 'TX',
  '49': 'UT',
  '50': 'VT',
  '51': 'VA',
  '53': 'WA',
  '54': 'WV',
  '55': 'WI',
  '56': 'WY',
}

export function catalogKeyFromCountryNumeric(id: string | number): string | null {
  const alpha = ISO_NUMERIC_TO_ALPHA2[String(id)]
  return alpha ? `country:${alpha}` : null
}

export function catalogKeyFromStateFips(id: string | number): string | null {
  const fips = String(id).padStart(2, '0')
  const alpha = FIPS_TO_STATE[fips]
  return alpha ? `state:${alpha}` : null
}
