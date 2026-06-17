#!/usr/bin/env node
/**
 * Fetch US State Department Travel Advisories RSS and write catalog-matched
 * Level 3 / Level 4 country lists for the Where to Retire map.
 *
 * Run manually / periodically — advisories change every few months:
 *   npm run refresh-travel-advisories
 *
 * NOT run at app startup or build time. Re-run after major State Dept updates.
 *
 * Source: https://travel.state.gov/_res/rss/TAsTWs.xml
 * Output: client/src/data/travel-advisories.generated.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../client/src/data')
const CSV_PATH = path.join(DATA_DIR, 'cost-of-living.csv')
const OUTPUT_PATH = path.join(DATA_DIR, 'travel-advisories.generated.json')
const FEED_URL = 'https://travel.state.gov/_res/rss/TAsTWs.xml'

/** Mirrors EXCLUDED_COUNTRIES in client/src/utils/costOfLiving.ts */
const HARD_EXCLUDED_COUNTRIES = new Set(
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
    'Saudi Arabia',
    'Afghanistan',
    'Brunei',
    'Mauritania',
  ].map((c) => normalizeKey(c)),
)

/**
 * Feed country name → catalog country name.
 * Add entries when Task 2.4 finds spelling mismatches.
 */
const FEED_COUNTRY_ALIASES = {
  Türkiye: 'Turkey',
  Turkiye: 'Turkey',
  Czechia: 'Czech Republic',
  'Bosnia and Herzegovina': 'Bosnia And Herzegovina',
  'Trinidad and Tobago': 'Trinidad And Tobago',
  "Cote d'Ivoire": 'Ivory Coast',
  "Côte d'Ivoire": 'Ivory Coast',
  'The Bahamas': 'Bahamas',
  'The Gambia': 'Gambia',
  'Republic of Korea': 'South Korea',
  'Korea, Republic of': 'South Korea',
  'Kosovo': 'Kosovo (Disputed Territory)',
  'North Macedonia (Republic of North Macedonia)': 'North Macedonia',
  'Eswatini': 'Eswatini',
  'Curacao': 'Curacao',
  'Curaçao': 'Curacao',
  'Hong Kong SAR': 'Hong Kong',
  'Macau': 'Macau',
}

function normalizeKey(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function loadCatalogCountries() {
  const lines = fs.readFileSync(CSV_PATH, 'utf8').trim().split('\n').slice(1)
  const names = [...new Set(lines.map((line) => line.split(',')[1]).filter(Boolean))]
  const byKey = new Map()
  for (const name of names) {
    byKey.set(normalizeKey(name), name)
  }
  return { names: names.sort((a, b) => a.localeCompare(b)), byKey }
}

function resolveCatalogCountry(feedCountry, catalogByKey) {
  const trimmed = feedCountry.trim()
  const alias = FEED_COUNTRY_ALIASES[trimmed]
  if (alias && catalogByKey.has(normalizeKey(alias))) {
    return { country: catalogByKey.get(normalizeKey(alias)), matchedVia: 'alias' }
  }
  const direct = catalogByKey.get(normalizeKey(trimmed))
  if (direct) return { country: direct, matchedVia: 'exact' }
  return null
}

function parseLevel(threatCategory, title) {
  const fromCategory = threatCategory?.match(/Level\s+(\d)/i)?.[1]
  if (fromCategory) return Number(fromCategory)
  const fromTitle = title?.match(/Level\s+(\d)/i)?.[1]
  if (fromTitle) return Number(fromTitle)
  return null
}

function parseFeedCountry(title) {
  if (!title) return null
  const idx = title.search(/\s-\sLevel\s+\d/i)
  if (idx < 0) return null
  return title.slice(0, idx).trim()
}

function parseItems(xml) {
  const items = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRe.exec(xml))) {
    const block = match[1]
    const title = block.match(/<title>([^<]*)<\/title>/)?.[1]?.trim()
    const pubDate = block.match(/<pubDate>([^<]*)<\/pubDate>/)?.[1]?.trim() ?? ''
    const threatCategory =
      block.match(/<category domain="Threat-Level">([^<]*)<\/category>/)?.[1]?.trim() ?? ''
    const feedCountry = parseFeedCountry(title)
    const level = parseLevel(threatCategory, title)
    if (!feedCountry || level == null) continue
    items.push({
      title,
      feedCountry,
      level,
      levelLabel: threatCategory.replace(/^Level\s+\d:\s*/i, '').trim() || threatCategory,
      pubDate,
    })
  }
  return items
}

async function main() {
  const { names: catalogCountries, byKey: catalogByKey } = loadCatalogCountries()
  const response = await fetch(FEED_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch travel advisories: HTTP ${response.status}`)
  }
  const xml = await response.text()
  const channelPubDate = xml.match(/<channel>[\s\S]*?<pubDate>([^<]*)<\/pubDate>/)?.[1]?.trim() ?? ''
  const items = parseItems(xml)

  const level4 = []
  const level3 = []
  const unmatchedLevel4 = []
  const unmatchedLevel3 = []
  const aliasHits = []

  for (const item of items) {
    if (item.level !== 3 && item.level !== 4) continue
    const resolved = resolveCatalogCountry(item.feedCountry, catalogByKey)
    if (!resolved) {
      if (item.level === 4) unmatchedLevel4.push(item)
      if (item.level === 3) unmatchedLevel3.push(item)
      continue
    }
    if (HARD_EXCLUDED_COUNTRIES.has(normalizeKey(resolved.country))) continue
    const entry = {
      country: resolved.country,
      feedCountry: item.feedCountry,
      level: item.level,
      levelLabel: item.levelLabel,
      pubDate: item.pubDate,
      title: item.title,
    }
    if (resolved.matchedVia === 'alias') {
      aliasHits.push({ feedCountry: item.feedCountry, catalogCountry: resolved.country })
    }
    if (item.level === 4) level4.push(entry)
    if (item.level === 3) level3.push(entry)
  }

  const dedupeByCountry = (entries) => {
    const byCountry = new Map()
    for (const entry of entries) {
      const key = normalizeKey(entry.country)
      const existing = byCountry.get(key)
      if (!existing || Date.parse(entry.pubDate) > Date.parse(existing.pubDate)) {
        byCountry.set(key, entry)
      }
    }
    return [...byCountry.values()]
  }

  const level4Deduped = dedupeByCountry(level4)
  const level3Deduped = dedupeByCountry(level3)

  level4Deduped.sort((a, b) => a.country.localeCompare(b.country))
  level3Deduped.sort((a, b) => a.country.localeCompare(b.country))

  const output = {
    metadata: {
      sourceUrl: FEED_URL,
      fetchedAt: new Date().toISOString(),
      feedPubDate: channelPubDate,
      catalogCountryCount: catalogCountries.length,
      level4MatchedCount: level4Deduped.length,
      level3MatchedCount: level3Deduped.length,
      aliasMappingsUsed: aliasHits,
      unmatchedLevel4: unmatchedLevel4.map((item) => ({
        feedCountry: item.feedCountry,
        title: item.title,
        pubDate: item.pubDate,
      })),
      unmatchedLevel3: unmatchedLevel3.map((item) => ({
        feedCountry: item.feedCountry,
        title: item.title,
        pubDate: item.pubDate,
      })),
    },
    level4: level4Deduped,
    level3: level3Deduped,
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Wrote ${OUTPUT_PATH}`)
  console.log(`Level 4 (Do Not Travel) in catalog: ${level4Deduped.length}`)
  console.log(`Level 3 (Reconsider Travel) in catalog: ${level3Deduped.length}`)
  if (aliasHits.length) {
    console.log('Alias mappings used:')
    for (const hit of aliasHits) {
      console.log(`  ${hit.feedCountry} → ${hit.catalogCountry}`)
    }
  }
  if (unmatchedLevel4.length) {
    console.log(`Unmatched Level 4 (${unmatchedLevel4.length}):`)
    for (const item of unmatchedLevel4) {
      console.log(`  ${item.feedCountry}`)
    }
  }
  if (unmatchedLevel3.length) {
    console.log(`Unmatched Level 3 (${unmatchedLevel3.length}) — not written to client data`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
