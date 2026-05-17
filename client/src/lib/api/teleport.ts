import { getTeleportFallback } from '../../data/teleportFallbacks'
import { cacheStoredAt, readApiCache, writeApiCache } from './apiCache'

const NAMESPACE = 'teleport'

export type TeleportScoreCategory = {
  name: string
  score: number
}

export const TELEPORT_COL_CATEGORY = 'Cost of Living'

export type TeleportScores = {
  colIndex: number | null
  qolScore: number | null
  categories: TeleportScoreCategory[]
  cityName: string | null
  source: 'api' | 'fallback'
}

type TeleportScoreEntry = {
  name: string
  score_out_of_10?: number
}

type TeleportScoresResponse = {
  categories?: TeleportScoreEntry[]
}

function parseScoreCategories(entries: TeleportScoreEntry[]): TeleportScoreCategory[] {
  return entries
    .filter((e) => typeof e.score_out_of_10 === 'number' && e.name)
    .map((e) => ({ name: e.name, score: e.score_out_of_10 as number }))
}

function fallbackProfile(citySlug: string): TeleportScores {
  const fb = getTeleportFallback(citySlug)
  return {
    colIndex: fb.col,
    qolScore: fb.qol,
    categories: [{ name: 'Quality of Life', score: fb.qol }],
    cityName: null,
    source: 'fallback',
  }
}

export function buildColBreakdown(scores: TeleportScores): TeleportScoreCategory[] {
  const fromCategories = scores.categories.find((c) => c.name === TELEPORT_COL_CATEGORY)
  if (fromCategories) return [fromCategories]
  if (scores.colIndex != null) {
    return [{ name: TELEPORT_COL_CATEGORY, score: scores.colIndex }]
  }
  return []
}

export function buildQolBreakdown(scores: TeleportScores): TeleportScoreCategory[] {
  if (scores.source === 'api' && scores.categories.length > 0) {
    return scores.categories
      .filter((c) => c.name !== TELEPORT_COL_CATEGORY)
      .sort((a, b) => {
        if (a.name === 'Quality of Life') return -1
        if (b.name === 'Quality of Life') return 1
        return a.name.localeCompare(b.name)
      })
  }
  if (scores.qolScore != null) {
    return [{ name: 'Quality of Life', score: scores.qolScore }]
  }
  return []
}

/** Free Teleport public API when available; otherwise manual fallbacks (swappable). */
export async function getTeleportProfile(citySlug: string): Promise<TeleportScores> {
  const cacheKey = `scores:v3:${citySlug}`
  const cached = readApiCache<TeleportScores>(NAMESPACE, cacheKey)
  if (
    cached &&
    (cached.source === 'api' || cached.source === 'fallback') &&
    Array.isArray(cached.categories)
  ) {
    return cached
  }

  try {
    const res = await fetch(
      `https://api.teleport.org/api/urban_areas/slug:${encodeURIComponent(citySlug)}/scores/`,
    )
    if (!res.ok) {
      const profile = fallbackProfile(citySlug)
      writeApiCache(NAMESPACE, cacheKey, profile)
      return profile
    }

    const json = (await res.json()) as TeleportScoresResponse
    const rawCategories = json.categories ?? []
    const col = rawCategories.find((c) => c.name === 'Cost of Living')
    const qol = rawCategories.find((c) => c.name === 'Quality of Life')
    const categories = parseScoreCategories(rawCategories)
    const profile: TeleportScores = {
      colIndex: col?.score_out_of_10 ?? null,
      qolScore: qol?.score_out_of_10 ?? null,
      categories,
      cityName: null,
      source: 'api',
    }
    if (profile.colIndex == null && profile.qolScore == null) {
      const fb = fallbackProfile(citySlug)
      writeApiCache(NAMESPACE, cacheKey, fb)
      return fb
    }
    writeApiCache(NAMESPACE, cacheKey, profile)
    return profile
  } catch {
    const profile = fallbackProfile(citySlug)
    writeApiCache(NAMESPACE, cacheKey, profile)
    return profile
  }
}

export function getTeleportCacheAge(citySlug: string): number | null {
  return cacheStoredAt(NAMESPACE, `scores:v3:${citySlug}`)
}

export type TeleportLivingCost = {
  monthlyUsd: number
  source: 'api' | 'fallback'
}

type TeleportDetailCategory = {
  id?: string
  label?: string
  value?: number
  amount?: number
  currency?: string
}

type TeleportDetailsResponse = {
  categories?: TeleportDetailCategory[]
  total_monthly?: { amount?: number; currency?: string }
}

function sumDetailCategories(categories: TeleportDetailCategory[]): number | null {
  let total = 0
  let count = 0
  for (const cat of categories) {
    const raw = cat.value ?? cat.amount
    if (raw == null || !Number.isFinite(raw)) continue
    const currency = (cat.currency ?? 'USD').toUpperCase()
    if (currency !== 'USD') continue
    total += raw
    count += 1
  }
  return count > 0 ? Math.round(total) : null
}

/** Monthly living cost from Teleport urban-area details; catalog fallback when API unavailable. */
export async function getTeleportMonthlyLivingCost(
  citySlug: string,
  fallbackUsd: number,
): Promise<TeleportLivingCost> {
  const cacheKey = `living-cost:v1:${citySlug}`
  const cached = readApiCache<TeleportLivingCost>(NAMESPACE, cacheKey)
  if (cached && (cached.source === 'api' || cached.source === 'fallback')) return cached

  const fallback: TeleportLivingCost = {
    monthlyUsd: Math.round(fallbackUsd),
    source: 'fallback',
  }

  try {
    const res = await fetch(
      `https://api.teleport.org/api/urban_areas/slug:${encodeURIComponent(citySlug)}/details/`,
    )
    if (!res.ok) {
      writeApiCache(NAMESPACE, cacheKey, fallback)
      return fallback
    }

    const json = (await res.json()) as TeleportDetailsResponse
    const totalMonthly = json.total_monthly
    if (
      totalMonthly?.amount != null &&
      Number.isFinite(totalMonthly.amount) &&
      (totalMonthly.currency ?? 'USD').toUpperCase() === 'USD'
    ) {
      const profile: TeleportLivingCost = {
        monthlyUsd: Math.round(totalMonthly.amount),
        source: 'api',
      }
      writeApiCache(NAMESPACE, cacheKey, profile)
      return profile
    }

    const summed = sumDetailCategories(json.categories ?? [])
    if (summed != null && summed > 0) {
      const profile: TeleportLivingCost = { monthlyUsd: summed, source: 'api' }
      writeApiCache(NAMESPACE, cacheKey, profile)
      return profile
    }

    writeApiCache(NAMESPACE, cacheKey, fallback)
    return fallback
  } catch {
    writeApiCache(NAMESPACE, cacheKey, fallback)
    return fallback
  }
}
