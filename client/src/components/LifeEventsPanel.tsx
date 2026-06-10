import { useCallback, useMemo, useState } from 'react'
import { blendedGrowthRate, type LifeEventsProjectionData } from '../lib/calc/lifeEvents'
import { createLifeEventInstance } from '../lib/planStorage/growthLifeEvents'
import { AppSelect } from './ui/AppSelect'
import { LIFE_EVENT_CONFIGS, getLifeEventConfig } from './life-events/eventConfigs'
import {
  LIFE_EVENT_FILTER_OPTIONS,
  LIFE_EVENT_GROUP_LABELS,
  LIFE_EVENT_GROUP_ORDER,
} from './life-events/eventGroups'
import { calcTypeCardImpact } from './life-events/instanceImpact'
import { LifeEventTypeCard } from './life-events/LifeEventTypeCard'
import type { LifeEventFilterId, LifeEventTypeCard as LifeEventTypeCardState } from './life-events/types'
import { formatCurrency } from './life-events/utils'
import './LifeEventsPanel.scss'

export type LifeEventActiveImpact = {
  portfolioDelta: number
  monthlyIncomeDelta: number
}

export interface LifeEventsPanelProps {
  projectionData: LifeEventsProjectionData
  retirementYear: number
  monthlyPortfolioIncome: number
  activePhase: 'growth' | 'income'
  withdrawalRate: number
  hsaBalance: number
  eventCards: LifeEventTypeCardState[]
  onEventCardsChange: (cards: LifeEventTypeCardState[]) => void
  onEventActiveChange?: (
    configId: string,
    isActive: boolean,
    impact: LifeEventActiveImpact,
  ) => void
  className?: string
}

function lifeEventCountWord(count: number): string {
  const words = [
    'Zero',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
  ]
  return words[count] ?? String(count)
}

function lifeEventCountTitle(count: number): { word: string; noun: string } {
  return {
    word: lifeEventCountWord(count),
    noun: count === 1 ? 'Life Event' : 'Life Events',
  }
}

export function LifeEventsPanel({
  projectionData,
  retirementYear,
  monthlyPortfolioIncome: _monthlyPortfolioIncome,
  activePhase,
  withdrawalRate: _withdrawalRate,
  hsaBalance,
  eventCards,
  onEventCardsChange,
  onEventActiveChange = () => {},
  className = '',
}: LifeEventsPanelProps) {
  const [filter, setFilter] = useState<LifeEventFilterId>('all')
  const currentYear = projectionData.currentYear
  const retirementPortfolio = projectionData.baselineTotalAtRetirement
  const growthRate = blendedGrowthRate(projectionData)

  const impactContext = useMemo(
    () => ({
      currentYear,
      retirementYear,
      retirementPortfolio,
      growthRate,
      hsaBalance,
    }),
    [currentYear, retirementYear, retirementPortfolio, growthRate, hsaBalance],
  )

  const cardImpacts = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calcTypeCardImpact>>()
    for (const card of eventCards) {
      const config = getLifeEventConfig(card.configId)
      if (!config) continue
      map.set(card.configId, calcTypeCardImpact(card, config, impactContext))
    }
    return map
  }, [eventCards, impactContext])

  const totalActiveImpact = useMemo(
    () =>
      eventCards
        .filter((c) => c.isActive)
        .reduce((sum, card) => {
          const impact = cardImpacts.get(card.configId)
          return sum + (impact?.totalFutureValue ?? 0)
        }, 0),
    [eventCards, cardImpacts],
  )

  const activeEventCount = useMemo(
    () => eventCards.filter((c) => c.isActive).length,
    [eventCards],
  )

  const activeEventTitle = useMemo(
    () => (activeEventCount > 0 ? lifeEventCountTitle(activeEventCount) : null),
    [activeEventCount],
  )

  const filteredCards = useMemo(() => {
    if (filter === 'all') return eventCards
    return eventCards.filter((card) => getLifeEventConfig(card.configId)?.group === filter)
  }, [eventCards, filter])

  const updateCard = useCallback(
    (configId: string, updates: Partial<LifeEventTypeCardState>) => {
      onEventCardsChange(
        eventCards.map((c) => (c.configId === configId ? { ...c, ...updates } : c)),
      )
    },
    [eventCards, onEventCardsChange],
  )

  const updateInstance = useCallback(
    (configId: string, instanceId: string, updates: Partial<LifeEventTypeCardState['instances'][number]>) => {
      onEventCardsChange(
        eventCards.map((c) =>
          c.configId === configId
            ? {
                ...c,
                instances: c.instances.map((inst) =>
                  inst.id === instanceId ? { ...inst, ...updates } : inst,
                ),
              }
            : c,
        ),
      )
    },
    [eventCards, onEventCardsChange],
  )

  const addInstance = useCallback(
    (configId: string) => {
      onEventCardsChange(
        eventCards.map((c) =>
          c.configId === configId
            ? {
                ...c,
                instances: [
                  ...c.instances,
                  createLifeEventInstance(configId, currentYear, retirementYear),
                ],
              }
            : c,
        ),
      )
    },
    [eventCards, onEventCardsChange, currentYear, retirementYear],
  )

  const removeInstance = useCallback(
    (configId: string, instanceId: string) => {
      onEventCardsChange(
        eventCards.map((c) => {
          if (c.configId !== configId) return c
          const nextInstances = c.instances.filter((inst) => inst.id !== instanceId)
          return {
            ...c,
            instances:
              nextInstances.length > 0
                ? nextInstances
                : [createLifeEventInstance(configId, currentYear, retirementYear)],
          }
        }),
      )
    },
    [eventCards, onEventCardsChange, currentYear, retirementYear],
  )

  const handleActiveChange = useCallback(
    (configId: string, isActive: boolean, futureValue: number) => {
      onEventActiveChange(configId, isActive, {
        portfolioDelta: isActive ? -futureValue : 0,
        monthlyIncomeDelta: 0,
      })
    },
    [onEventActiveChange],
  )

  const panelClassName = ['life-events-panel', className].filter(Boolean).join(' ')

  const totalImpactDisplay =
    totalActiveImpact > 0
      ? `-${formatCurrency(totalActiveImpact)}`
      : totalActiveImpact < 0
        ? `+${formatCurrency(Math.abs(totalActiveImpact))}`
        : formatCurrency(0)

  const totalImpactClassName = [
    'life-events-panel__impact-value tabular-nums',
    totalActiveImpact < 0 && 'life-events-panel__impact-value--inflow',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {activePhase === 'income' ? (
        <header className="life-events-panel__header account-balances-header-row">
          <div className="account-balances-header-row__title-block">
            <h2 id="life-events-heading" className="account-balances-header-row__title">
              Life events — income phase
            </h2>
            <p className="account-balances-header-row__subtitle account-balances-header-row__subtitle--note">
              Moments that affect your monthly draw and portfolio runway after retirement
            </p>
          </div>
        </header>
      ) : (
        <header className="life-events-panel__header account-balances-header-row">
          <div className="account-balances-header-row__title-block">
            <h2 id="life-events-heading" className="account-balances-header-row__title">
              {activeEventTitle ? (
                <>
                  {activeEventTitle.word}{' '}
                  <span className="life-events-panel__active-count">({activeEventCount})</span>{' '}
                  {activeEventTitle.noun}
                </>
              ) : (
                'Life events'
              )}
            </h2>
            <p className="account-balances-header-row__subtitle account-balances-header-row__subtitle--note">
              Moments that pull from your compounding portfolio before retirement
            </p>
          </div>
          <div className="life-events-panel__toolbar">
            <AppSelect
              id="life-events-filter"
              triggerId="life-events-filter"
              ariaLabel="Filter life events"
              value={filter}
              onChange={(id) => setFilter(id as LifeEventFilterId)}
              options={LIFE_EVENT_FILTER_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
              className="life-events-panel__filter app-select--compact"
              layout="hero"
            />
            <div className="life-events-panel__impact">
              <span className={totalImpactClassName}>{totalImpactDisplay}</span>
              <span className="life-events-panel__impact-label">Total impact</span>
            </div>
          </div>
        </header>
      )}

      <section className={panelClassName} aria-labelledby="life-events-heading">
        {activePhase === 'income' ? (
          <div className="life-events-panel__income-empty">
            <p className="life-events-panel__income-empty-text">No income phase events yet.</p>
            <p className="life-events-panel__income-empty-subtext">
              Switch to growth phase to model expenses before retirement.
            </p>
          </div>
        ) : (
          LIFE_EVENT_GROUP_ORDER.map((groupId) => {
            const groupCards = filteredCards.filter(
              (card) => getLifeEventConfig(card.configId)?.group === groupId,
            )
            if (groupCards.length === 0) return null

            return (
              <div key={groupId} className="life-events-panel__group">
                <h3 className="life-events-panel__group-heading">
                  {LIFE_EVENT_GROUP_LABELS[groupId]}
                </h3>
                <div className="life-events-grid">
                  {groupCards.map((card) => {
                    const config = LIFE_EVENT_CONFIGS.find((c) => c.id === card.configId)
                    const impact = cardImpacts.get(card.configId)
                    if (!config || !impact) return null

                    return (
                      <LifeEventTypeCard
                        key={card.configId}
                        config={config}
                        card={card}
                        impact={impact}
                        currentYear={currentYear}
                        retirementYear={retirementYear}
                        retirementPortfolio={retirementPortfolio}
                        growthRate={growthRate}
                        hsaBalance={hsaBalance}
                        onCardChange={(updates) => updateCard(card.configId, updates)}
                        onInstanceChange={(instanceId, updates) =>
                          updateInstance(card.configId, instanceId, updates)
                        }
                        onAddInstance={() => addInstance(card.configId)}
                        onRemoveInstance={(instanceId) =>
                          removeInstance(card.configId, instanceId)
                        }
                        onActiveChange={handleActiveChange}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </section>
    </>
  )
}
