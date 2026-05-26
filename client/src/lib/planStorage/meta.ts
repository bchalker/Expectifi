import { EXPECTIFI_META_KEY } from './keys'
import type { ExpectifiMeta, PersistedGuestTier } from './types'
import { PLAN_META_VERSION } from './types'
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from './storageUtils'

export function defaultMeta(tier: PersistedGuestTier = 'anonymous'): ExpectifiMeta {
  return {
    version: PLAN_META_VERSION,
    tier,
    visitCount: 0,
    prompts: {},
  }
}

export function loadMeta(): ExpectifiMeta | null {
  const raw = readJsonFromLocalStorage<ExpectifiMeta>(EXPECTIFI_META_KEY)
  if (!raw || raw.version !== PLAN_META_VERSION) return null
  if (raw.tier !== 'anonymous' && raw.tier !== 'browser_saved') return null
  return {
    ...defaultMeta(raw.tier),
    ...raw,
    visitCount: typeof raw.visitCount === 'number' ? raw.visitCount : 0,
    prompts: raw.prompts && typeof raw.prompts === 'object' ? raw.prompts : {},
  }
}

export function saveMeta(meta: ExpectifiMeta): void {
  writeJsonToLocalStorage(EXPECTIFI_META_KEY, meta)
}

export function setPersistedGuestTier(tier: PersistedGuestTier): ExpectifiMeta {
  const next: ExpectifiMeta = {
    ...(loadMeta() ?? defaultMeta(tier)),
    tier,
  }
  saveMeta(next)
  return next
}
