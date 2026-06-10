import type { LifeEventFilterId, LifeEventGroupId } from './types'

export const LIFE_EVENT_GROUP_ORDER: LifeEventGroupId[] = [
  'capital-decisions',
  'unexpected-hits',
  'windfalls',
]

export const LIFE_EVENT_GROUP_LABELS: Record<LifeEventGroupId, string> = {
  'capital-decisions': 'Capital decisions',
  'unexpected-hits': 'Unexpected hits',
  'windfalls': 'Windfalls',
}

export const LIFE_EVENT_FILTER_OPTIONS: { id: LifeEventFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'capital-decisions', label: 'Capital decisions' },
  { id: 'unexpected-hits', label: 'Unexpected hits' },
  { id: 'windfalls', label: 'Windfalls' },
]
