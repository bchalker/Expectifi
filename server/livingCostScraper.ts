import * as cheerio from 'cheerio'

export type LivingCostPriceItem = {
  label: string
  usd: number
}

export type LivingCostCategory = {
  name: string
  items: LivingCostPriceItem[]
}

export type LivingCostSnapshot = {
  path: string
  name: string
  level: 'city' | 'country'
  summary: {
    totalSingleUsd: number | null
    totalFamilyUsd: number | null
    rentSingleUsd: number | null
    rentFamilyUsd: number | null
    foodSingleUsd: number | null
    foodFamilyUsd: number | null
    transportSingleUsd: number | null
    transportFamilyUsd: number | null
    salaryUsd: number | null
    qualityScore: number | null
    population: string | null
  }
  categories: LivingCostCategory[]
}

const LIVING_COST_ORIGIN = 'https://livingcost.org'
const FETCH_HEADERS = {
  'User-Agent': 'retirement-calculator/1.0 (+https://github.com/)',
  Accept: 'text/html',
}

const cache = new Map<string, { at: number; data: LivingCostSnapshot }>()
const CACHE_TTL_MS = 60 * 60 * 1000

function parseUsd(raw: string | undefined): number | null {
  if (raw == null || raw === '') return null
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

function rowPair($: cheerio.CheerioAPI, id: string): { single: number | null; family: number | null } {
  const spans = $(`th#${id}`).closest('tr').find('span[data-usd]')
  return {
    single: parseUsd(spans.eq(0).attr('data-usd')),
    family: parseUsd(spans.eq(1).attr('data-usd')),
  }
}

function rowSingle($: cheerio.CheerioAPI, id: string): number | null {
  const raw = $(`th#${id}`).closest('tr').find('span[data-usd]').first().attr('data-usd')
  return parseUsd(raw)
}

function displayNameFromPage($: cheerio.CheerioAPI, path: string): string {
  const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim()
  const inMatch = h1.match(/\bin\s+(.+)$/i)
  if (inMatch?.[1]) return inMatch[1]
  const segment = path.split('/').pop() ?? path
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function parseLivingCostHtml(path: string, html: string): LivingCostSnapshot {
  const $ = cheerio.load(html)
  const segments = path.split('/').filter(Boolean)
  const level: 'city' | 'country' = segments.length >= 2 ? 'city' : 'country'

  const total = rowPair($, 'total')
  const rent = rowPair($, 'rent')
  const food = rowPair($, 'food')
  const transport = rowPair($, 'transport')

  const populationRaw = $('th#population').closest('tr').find('td').first().text().replace(/\s+/g, ' ').trim()
  const population = populationRaw || null

  const categories: LivingCostCategory[] = []
  $('table caption').each((_, capEl) => {
    const name = $(capEl).text().replace(/\s+/g, ' ').trim()
    if (!name) return
    const table = $(capEl).parent('table')
    const items: LivingCostPriceItem[] = []
    table.find('tbody tr').each((__, tr) => {
      const label = $(tr)
        .find('th')
        .text()
        .replace(/\s+/g, ' ')
        .trim()
      const usd = parseUsd($(tr).find('span[data-usd]').first().attr('data-usd'))
      if (!label || usd == null) return
      items.push({ label, usd })
    })
    if (items.length > 0) categories.push({ name, items })
  })

  return {
    path,
    name: displayNameFromPage($, path),
    level,
    summary: {
      totalSingleUsd: total.single,
      totalFamilyUsd: total.family,
      rentSingleUsd: rent.single,
      rentFamilyUsd: rent.family,
      foodSingleUsd: food.single,
      foodFamilyUsd: food.family,
      transportSingleUsd: transport.single,
      transportFamilyUsd: transport.family,
      salaryUsd: rowSingle($, 'salary'),
      qualityScore: rowSingle($, 'quality'),
      population,
    },
    categories,
  }
}

export async function fetchLivingCostSnapshot(path: string): Promise<LivingCostSnapshot> {
  const cached = cache.get(path)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data
  }

  const url = `${LIVING_COST_ORIGIN}/cost/${path}`
  const res = await fetch(url, { headers: FETCH_HEADERS })
  if (!res.ok) {
    throw new Error(`upstream_${res.status}`)
  }
  const html = await res.text()
  const data = parseLivingCostHtml(path, html)
  if (data.summary.totalSingleUsd == null && data.categories.length === 0) {
    throw new Error('parse_failed')
  }
  cache.set(path, { at: Date.now(), data })
  return data
}
