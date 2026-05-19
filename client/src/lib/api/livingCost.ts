import { apiFetchJson } from '../api'

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

type LivingCostResponse = { ok: true; snapshot: LivingCostSnapshot }

const memoryCache = new Map<string, LivingCostSnapshot>()

export function getCachedLivingCostSnapshot(path: string): LivingCostSnapshot | undefined {
  return memoryCache.get(path)
}

export async function fetchLivingCostSnapshot(path: string): Promise<LivingCostSnapshot> {
  const hit = memoryCache.get(path)
  if (hit) return hit

  const data = await apiFetchJson<LivingCostResponse>(
    `/api/where-to-retire/living-cost?path=${encodeURIComponent(path)}`,
  )
  memoryCache.set(path, data.snapshot)
  return data.snapshot
}
