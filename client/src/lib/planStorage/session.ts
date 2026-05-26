import { hydrateAppSnapshot, parseSnapshot } from '../appSnapshot'
import type { CalculatorInputs } from '../computeResults'
import { EXPECTIFI_SESSION_KEY } from './keys'
import type { PlanSessionSnapshot } from './types'
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from './storageUtils'
import { canWriteExpectifiPlanBlobs } from './writeContext'

export function loadPlanSession(): PlanSessionSnapshot | null {
  const raw = readJsonFromLocalStorage<unknown>(EXPECTIFI_SESSION_KEY)
  if (!raw) return null
  return parseSnapshot(raw)
}

export function savePlanSession(snapshot: PlanSessionSnapshot): void {
  if (!canWriteExpectifiPlanBlobs()) return
  writeJsonToLocalStorage(EXPECTIFI_SESSION_KEY, snapshot)
}

export function hydratePlanSession(
  raw: PlanSessionSnapshot | null,
  defaultInputs: CalculatorInputs,
): PlanSessionSnapshot | null {
  if (!raw) return null
  return hydrateAppSnapshot(raw, defaultInputs)
}
