export type ResourceLink = {
  label: string
  url: string
  category: 'visa' | 'tax' | 'community' | 'healthcare' | 'col' | 'official'
}

export type ResourceKey = `country:${string}` | `state:${string}`

const RESOURCES: Record<string, ResourceLink[]> = {
  'country:PT': [
    { label: 'Portugal immigration portal', url: 'https://www.imigrante.sef.pt/', category: 'visa' },
    { label: 'IRS — US citizens abroad', url: 'https://www.irs.gov/individuals/international-taxpayers', category: 'tax' },
    { label: 'Numbeo — Portugal', url: 'https://www.numbeo.com/cost-of-living/country_result.jsp?country=Portugal', category: 'col' },
    { label: 'Americans in Portugal (FB)', url: 'https://www.facebook.com/groups/americansinportugal/', category: 'community' },
  ],
  'country:IT': [
    { label: 'Italian Ministry of Foreign Affairs — visas', url: 'https://vistoperitalia.esteri.it/', category: 'visa' },
    { label: 'Agenzia Entrate — flat tax regime', url: 'https://www.agenziaentrate.gov.it/', category: 'tax' },
    { label: 'Numbeo — Italy', url: 'https://www.numbeo.com/cost-of-living/country_result.jsp?country=Italy', category: 'col' },
    { label: 'US Embassy Rome — retirees', url: 'https://it.usembassy.gov/', category: 'official' },
  ],
  'country:MX': [
    { label: 'Mexico INM — residency', url: 'https://www.inm.gob.mx/', category: 'visa' },
    { label: 'IRS — foreign earned income', url: 'https://www.irs.gov/individuals/international-taxpayers', category: 'tax' },
    { label: 'Numbeo — Mexico', url: 'https://www.numbeo.com/cost-of-living/country_result.jsp?country=Mexico', category: 'col' },
    { label: 'Expats in Mexico resources', url: 'https://www.facebook.com/groups/expatsinmexico/', category: 'community' },
  ],
  'country:CR': [
    { label: 'Costa Rica migration', url: 'https://www.migracion.go.cr/', category: 'visa' },
    { label: 'CCSS — public health', url: 'https://www.ccss.sa.cr/', category: 'healthcare' },
    { label: 'Numbeo — Costa Rica', url: 'https://www.numbeo.com/cost-of-living/country_result.jsp?country=Costa+Rica', category: 'col' },
  ],
  'country:TH': [
    { label: 'Thailand Elite / retirement visa info', url: 'https://www.thaievisa.go.th/', category: 'visa' },
    { label: 'IRS — international taxpayers', url: 'https://www.irs.gov/individuals/international-taxpayers', category: 'tax' },
    { label: 'Numbeo — Thailand', url: 'https://www.numbeo.com/cost-of-living/country_result.jsp?country=Thailand', category: 'col' },
  ],
  'state:FL': [
    { label: 'Florida Dept. of Revenue — retirement', url: 'https://floridarevenue.com/', category: 'tax' },
    { label: 'Florida retirement guide', url: 'https://www.visitflorida.com/', category: 'official' },
    { label: 'Medicare.gov — plan finder', url: 'https://www.medicare.gov/plan-compare/', category: 'healthcare' },
    { label: 'Numbeo — United States', url: 'https://www.numbeo.com/cost-of-living/country_result.jsp?country=United+States', category: 'col' },
  ],
  'state:TX': [
    { label: 'Texas Comptroller — tax info', url: 'https://comptroller.texas.gov/taxes/', category: 'tax' },
    { label: 'Texas.gov — retire in Texas', url: 'https://www.texas.gov/', category: 'official' },
    { label: 'Medicare.gov — plan finder', url: 'https://www.medicare.gov/plan-compare/', category: 'healthcare' },
    { label: 'Numbeo — United States', url: 'https://www.numbeo.com/cost-of-living/country_result.jsp?country=United+States', category: 'col' },
  ],
  'state:AZ': [
    { label: 'Arizona Dept. of Revenue', url: 'https://azdor.gov/', category: 'tax' },
    { label: 'Arizona retirement communities', url: 'https://www.visitarizona.com/', category: 'official' },
    { label: 'Medicare.gov — plan finder', url: 'https://www.medicare.gov/plan-compare/', category: 'healthcare' },
  ],
  'state:NC': [
    { label: 'NC Dept. of Revenue', url: 'https://www.ncdor.gov/', category: 'tax' },
    { label: 'NC retirement living', url: 'https://www.visitnc.com/', category: 'official' },
    { label: 'Medicare.gov — plan finder', url: 'https://www.medicare.gov/plan-compare/', category: 'healthcare' },
  ],
}

const DEFAULT_COUNTRY_RESOURCES: ResourceLink[] = [
  { label: 'IRS — international taxpayers', url: 'https://www.irs.gov/individuals/international-taxpayers', category: 'tax' },
  { label: 'US State Dept — country info', url: 'https://travel.state.gov/content/travel/en/international-travel.html', category: 'official' },
  { label: 'Numbeo cost of living', url: 'https://www.numbeo.com/cost-of-living/', category: 'col' },
]

const DEFAULT_STATE_RESOURCES: ResourceLink[] = [
  { label: 'Tax Foundation — state taxes', url: 'https://taxfoundation.org/data/all/state/state-income-tax-rates/', category: 'tax' },
  { label: 'Medicare.gov — plan finder', url: 'https://www.medicare.gov/plan-compare/', category: 'healthcare' },
  { label: 'Social Security — Medicare enrollment', url: 'https://www.ssa.gov/medicare/', category: 'healthcare' },
]

export function getDestinationResources(
  kind: 'country' | 'us-state',
  code: string,
): ResourceLink[] {
  const key = `${kind === 'country' ? 'country' : 'state'}:${code.toUpperCase()}`
  const specific = RESOURCES[key]
  if (specific?.length) return specific.slice(0, 4)
  return (kind === 'country' ? DEFAULT_COUNTRY_RESOURCES : DEFAULT_STATE_RESOURCES).slice(0, 4)
}
