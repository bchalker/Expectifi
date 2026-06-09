import { apiFetchJson } from '../api'
import type { UserPlanStatePayload } from '../planStateTypes'

type PlanStateGetResponse = {
  ok: true
  planState: UserPlanStatePayload | null
  updatedAt?: string
}

export async function fetchUserPlanState(): Promise<{
  planState: UserPlanStatePayload | null
  updatedAt: string | null
}> {
  const data = await apiFetchJson<PlanStateGetResponse>('/api/user/plan-state')
  if (!data.planState || data.planState.version !== 1) {
    return { planState: null, updatedAt: data.updatedAt ?? null }
  }
  return { planState: data.planState, updatedAt: data.updatedAt ?? null }
}

export async function saveUserPlanState(payload: UserPlanStatePayload): Promise<void> {
  await apiFetchJson<{ ok: true }>('/api/user/plan-state', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteUserPlanState(): Promise<void> {
  await apiFetchJson<{ ok: true }>('/api/user/plan-state', { method: 'DELETE' })
}
