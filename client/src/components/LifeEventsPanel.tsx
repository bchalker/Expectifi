import { useCallback, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  type ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import {
  buildImpactSentence,
  classifyEvent,
  eventBadgeText,
  eventPhaseLabel,
  newEventId,
  presetLifeEvent,
  projectPortfolioTimeline,
  retirementDateShiftMonths,
  totalEventOutflows,
  type LifeEvent,
  type LifeEventPresetId,
  type LifeEventType,
  type LifeEventsProjectionData,
} from '../lib/calc/lifeEvents'
import { deriveDisplayLabel } from '../lib/lifeEventDisplayLabels'
import { fmt, fmtK } from '../utils/format'
import { AppButton } from './ui/AppButton'
import { SidePanelShell } from './SidePanelShell'
import './LifeEventsPanel.scss'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

type Props = {
  projectionData: LifeEventsProjectionData
  retirementYear: number
  monthlyPortfolioIncome: number
  className?: string
}

type BuilderDraft = Omit<LifeEvent, 'id'>

function LifeEventsEmptyIcon() {
  return (
    <svg className="life-events-empty__icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="14" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 16v2M9 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function formatSliderAmount(n: number, recurring: boolean): string {
  const rounded = Math.round(n)
  if (recurring) return `$${rounded.toLocaleString('en-US')}`
  if (rounded >= 1000) return `$${rounded.toLocaleString('en-US')}`
  return `$${rounded.toLocaleString('en-US')}`
}

function LifeEventSliderRow({
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  display: string
  onChange: (v: number) => void
}) {
  return (
    <div className="life-events-slider-row">
      <span className="life-events-slider-row__label">{label}</span>
      <div className="life-events-slider-row__track-wrap">
        <input
          type="range"
          className="life-events-slider-row__input"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          aria-valuetext={display}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      <span className="life-events-slider-row__value">{display}</span>
    </div>
  )
}

function LifeEventsChart({
  projectionData,
  events,
}: {
  projectionData: LifeEventsProjectionData
  events: LifeEvent[]
}) {
  const baseline = useMemo(
    () => projectPortfolioTimeline(projectionData, []),
    [projectionData],
  )
  const withEvents = useMemo(
    () => projectPortfolioTimeline(projectionData, events),
    [projectionData, events],
  )

  const chartData = useMemo(
    () => ({
      labels: baseline.years.map(String),
      datasets: [
        {
          label: 'Baseline',
          data: baseline.portfolioValues.map((v) => v / 1000),
          borderColor: '#7F77DD',
          borderDash: [5, 4],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.25,
          fill: false,
        },
        {
          label: 'With events',
          data: withEvents.portfolioValues.map((v) => v / 1000),
          borderColor: '#378ADD',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#378ADD',
          pointBorderColor: '#378ADD',
          pointHoverRadius: 4,
          tension: 0.25,
          fill: false,
        },
      ],
    }),
    [baseline, withEvents],
  )

  const chartOptions: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = (ctx.parsed.y ?? 0) * 1000
              return `${ctx.dataset.label}: ${fmtK(val)}`
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11, family: 'Nunito, system-ui, sans-serif' },
            color: 'var(--text-faint)',
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          grid: { color: 'color-mix(in srgb, var(--border) 60%, transparent)' },
          ticks: {
            font: { size: 11, family: 'Nunito, system-ui, sans-serif' },
            color: 'var(--text-faint)',
            callback: (v) => `$${v}k`,
          },
          border: { display: false },
        },
      },
    }),
    [],
  )

  return (
    <>
      <div className="life-events-chart-wrap">
        <div className="life-events-chart-canvas">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
      <div className="life-events-chart-legend" aria-hidden>
        <span className="life-events-chart-legend__item">
          <span className="life-events-chart-legend__swatch life-events-chart-legend__swatch--baseline" />
          baseline
        </span>
        <span className="life-events-chart-legend__item">
          <span className="life-events-chart-legend__dot" style={{ background: '#378ADD' }} />
          with events
        </span>
        <span className="life-events-chart-legend__item">
          <span className="life-events-chart-legend__swatch life-events-chart-legend__swatch--outflows" />
          outflows
        </span>
        <span className="life-events-chart-legend__item">
          <span className="life-events-chart-legend__swatch life-events-chart-legend__swatch--inflows" />
          inflows
        </span>
      </div>
    </>
  )
}

function LifeEventCard({
  event,
  expanded,
  projectionData,
  retirementYear,
  monthlyPortfolioIncome,
  onToggle,
  onPatch,
}: {
  event: LifeEvent
  expanded: boolean
  projectionData: LifeEventsProjectionData
  retirementYear: number
  monthlyPortfolioIncome: number
  onToggle: () => void
  onPatch: (patch: Partial<LifeEvent>) => void
}) {
  const isRecurring = event.type === 'recurring-out' || event.type === 'recurring-in'
  const impact = buildImpactSentence(event, retirementYear, monthlyPortfolioIncome)
  const phase = classifyEvent(event, retirementYear)
  const badgeBg = `color-mix(in srgb, ${event.color} 10%, white)`
  const amountMax = isRecurring ? 5000 : 200000
  const amountStep = isRecurring ? 50 : 1000
  const yearMin = projectionData.currentYear
  const yearMax = projectionData.retirementYear

  return (
    <div className="life-events-event">
      <button type="button" className="life-events-event__head" onClick={onToggle} aria-expanded={expanded}>
        <span className="life-events-event__dot" style={{ background: event.color }} aria-hidden />
        <span className="life-events-event__name-block">
          <span className="life-events-event__prefix">Expect if I...</span>
          <span className="life-events-event__name">{event.displayLabel}</span>
        </span>
        <span className="life-events-event__badges">
          <span
            className="life-events-event__badge"
            style={{ color: event.color, background: badgeBg }}
          >
            {eventBadgeText(event)}
          </span>
          <span className={`life-events-event__phase life-events-event__phase--${phase}`}>
            {phase === 'both' ? (
              <>
                <span className="life-events-event__phase-half life-events-event__phase-half--growth">growth</span>
                <span className="life-events-event__phase-half life-events-event__phase-half--income">+ income</span>
              </>
            ) : (
              eventPhaseLabel(phase)
            )}
          </span>
        </span>
        <span className="life-events-event__chevron" aria-hidden>
          {expanded ? <IconChevronDown size={16} strokeWidth={1.5} /> : <IconChevronRight size={16} strokeWidth={1.5} />}
        </span>
      </button>
      {expanded ? (
        <div className="life-events-event__drawer">
          <LifeEventSliderRow
            label={isRecurring ? 'Monthly amount' : 'Amount'}
            min={isRecurring ? 100 : 5000}
            max={amountMax}
            step={amountStep}
            value={event.amount}
            display={formatSliderAmount(event.amount, isRecurring)}
            onChange={(amount) => onPatch({ amount })}
          />
          <LifeEventSliderRow
            label="Year"
            min={yearMin}
            max={yearMax}
            step={1}
            value={event.year}
            display={String(event.year)}
            onChange={(year) => onPatch({ year })}
          />
          {isRecurring ? (
            <LifeEventSliderRow
              label="Duration (years)"
              min={1}
              max={20}
              step={1}
              value={event.duration ?? 1}
              display={`${event.duration ?? 1} yr`}
              onChange={(duration) => onPatch({ duration })}
            />
          ) : null}
          <div className="life-events-impact">
            {impact.split('\n').map((line, i) => (
              <p key={i} className="life-events-impact__line">
                {line}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EventBuilderDrawer({
  open,
  draft,
  projectionData,
  onDraftChange,
  onSave,
  onClose,
}: {
  open: boolean
  draft: BuilderDraft | null
  projectionData: LifeEventsProjectionData
  onDraftChange: (next: BuilderDraft) => void
  onSave: () => void
  onClose: () => void
}) {
  if (!draft) return null
  const isRecurring = draft.type === 'recurring-out' || draft.type === 'recurring-in'

  return (
    <SidePanelShell
      open={open}
      titleId="life-events-builder-title"
      title="Add life event"
      subtitle="Model a one-time or recurring cash flow"
      onClose={onClose}
      shellClassName="drawer-shell--right"
    >
      <div className="life-events-builder-fields">
        <div className="life-events-builder-field">
          <label htmlFor="life-event-label">Event name</label>
          <input
            id="life-event-label"
            type="text"
            value={draft.label}
            onChange={(e) => onDraftChange({ ...draft, label: e.target.value })}
          />
        </div>
        <div className="life-events-builder-field">
          <label htmlFor="life-event-type">Type</label>
          <select
            id="life-event-type"
            value={draft.type}
            onChange={(e) => {
              const type = e.target.value as LifeEventType
              const color =
                type === 'lump-sum-out'
                  ? '#E24B4A'
                  : type === 'recurring-out'
                    ? '#1D9E75'
                    : '#639922'
              onDraftChange({
                ...draft,
                type,
                color,
                duration: type === 'recurring-out' || type === 'recurring-in' ? (draft.duration ?? 5) : undefined,
              })
            }}
          >
            <option value="lump-sum-out">One-time expense</option>
            <option value="recurring-out">Recurring expense</option>
            <option value="lump-sum-in">One-time inflow</option>
            <option value="recurring-in">Recurring income</option>
          </select>
        </div>
        <LifeEventSliderRow
          label={isRecurring ? 'Monthly amount' : 'Amount'}
          min={isRecurring ? 100 : 5000}
          max={isRecurring ? 5000 : 200000}
          step={isRecurring ? 50 : 1000}
          value={draft.amount}
          display={formatSliderAmount(draft.amount, isRecurring)}
          onChange={(amount) => onDraftChange({ ...draft, amount })}
        />
        <LifeEventSliderRow
          label="Year"
          min={projectionData.currentYear}
          max={projectionData.retirementYear}
          step={1}
          value={draft.year}
          display={String(draft.year)}
          onChange={(year) => onDraftChange({ ...draft, year })}
        />
        {isRecurring ? (
          <LifeEventSliderRow
            label="Duration (years)"
            min={1}
            max={20}
            step={1}
            value={draft.duration ?? 1}
            display={`${draft.duration ?? 1} yr`}
            onChange={(duration) => onDraftChange({ ...draft, duration })}
          />
        ) : null}
        <div className="life-events-builder-actions">
          <AppButton type="button" variant="primary" onPress={onSave}>
            Save event
          </AppButton>
          <AppButton type="button" variant="secondary" onPress={onClose}>
            Cancel
          </AppButton>
        </div>
      </div>
    </SidePanelShell>
  )
}

function retirementMonthLabel(retirementYear: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[0]} ${retirementYear}`
}

export function LifeEventsPanel({
  projectionData,
  retirementYear,
  monthlyPortfolioIncome,
  className = '',
}: Props) {
  const [events, setEvents] = useState<LifeEvent[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderDraft, setBuilderDraft] = useState<BuilderDraft | null>(null)

  const baselineAtRetirement = projectionData.baselineTotalAtRetirement
  const withEventsProjection = useMemo(
    () => projectPortfolioTimeline(projectionData, events),
    [projectionData, events],
  )
  const withEventsAtRetirement = withEventsProjection.totalAtRetirement
  const netImpact = withEventsAtRetirement - baselineAtRetirement
  const outflowsTotal = useMemo(() => totalEventOutflows(events), [events])
  const shiftMonths = useMemo(
    () => retirementDateShiftMonths(projectionData, events),
    [projectionData, events],
  )

  const openBuilder = useCallback(
    (preset: LifeEventPresetId) => {
      const base = presetLifeEvent(preset, projectionData)
      setBuilderDraft(base)
      setBuilderOpen(true)
    },
    [projectionData],
  )

  const saveBuilder = useCallback(() => {
    if (!builderDraft) return
    const id = newEventId()
    const displayLabel = deriveDisplayLabel(builderDraft.label)
    const next: LifeEvent = { ...builderDraft, id, displayLabel }
    setEvents((prev) => [...prev, next])
    setExpandedId(id)
    setBuilderOpen(false)
    setBuilderDraft(null)
  }, [builderDraft])

  const patchEvent = useCallback((id: string, patch: Partial<LifeEvent>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }, [])

  const panelClass = ['life-events-panel', className].filter(Boolean).join(' ')

  if (events.length === 0) {
    return (
      <section className={panelClass} aria-labelledby="life-events-heading">
        <header className="life-events-panel__header">
          <h2 id="life-events-heading" className="life-events-panel__title">
            Life events
          </h2>
          <p className="life-events-panel__subhead">Model how major expenses affect your retirement date</p>
        </header>
        <div className="life-events-empty">
          <LifeEventsEmptyIcon />
          <h3 className="life-events-empty__heading">What if you paid off your mortgage in 2028?</h3>
          <p className="life-events-empty__subtext">
            Add a life event to see how it shifts your retirement projection. One-time pulls, recurring expenses, and
            future inflows all modeled in real time.
          </p>
          <AppButton type="button" variant="primary" onPress={() => openBuilder('custom')}>
            Add your first event
          </AppButton>
        </div>
        <EventBuilderDrawer
          open={builderOpen}
          draft={builderDraft}
          projectionData={projectionData}
          onDraftChange={setBuilderDraft}
          onSave={saveBuilder}
          onClose={() => {
            setBuilderOpen(false)
            setBuilderDraft(null)
          }}
        />
      </section>
    )
  }

  return (
    <section className={panelClass} aria-labelledby="life-events-heading">
      <header className="life-events-panel__header">
        <div className="life-events-panel__title-row">
          <div>
            <h2 id="life-events-heading" className="life-events-panel__title">
              Life events
            </h2>
            <p className="life-events-panel__subhead">
              Retire {retirementMonthLabel(retirementYear)} · life events active
            </p>
          </div>
          <span className="life-events-panel__count-badge">{events.length} events</span>
        </div>
      </header>

      <div className="life-events-panel__card">
        <div className="life-events-metrics">
          <div className="life-events-metric">
            <div className="life-events-metric__label">Baseline portfolio</div>
            <div className="life-events-metric__value">{fmtK(baselineAtRetirement)}</div>
          </div>
          <div className="life-events-metric">
            <div className="life-events-metric__label">With all events</div>
            <div className="life-events-metric__value life-events-metric__value--amber">
              {fmtK(withEventsAtRetirement)}
            </div>
          </div>
          <div className="life-events-metric">
            <div className="life-events-metric__label">Net impact</div>
            <div
              className={[
                'life-events-metric__value',
                netImpact < 0 ? 'life-events-metric__value--negative' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {netImpact >= 0 ? '+' : ''}
              {fmtK(netImpact)}
            </div>
          </div>
        </div>

        <LifeEventsChart projectionData={projectionData} events={events} />

        <div className="life-events-list">
          <h3 className="life-events-list__heading">Life events</h3>
          {events.map((event) => (
            <LifeEventCard
              key={event.id}
              event={event}
              expanded={expandedId === event.id}
              projectionData={projectionData}
              retirementYear={retirementYear}
              monthlyPortfolioIncome={monthlyPortfolioIncome}
              onToggle={() => setExpandedId((id) => (id === event.id ? null : event.id))}
              onPatch={(patch) => patchEvent(event.id, patch)}
            />
          ))}
        </div>

        <div className="life-events-chips">
          <button type="button" className="life-events-chip" onClick={() => openBuilder('rental-income')}>
            + rental income
          </button>
          <button type="button" className="life-events-chip" onClick={() => openBuilder('home-renovation')}>
            + home renovation
          </button>
          <button type="button" className="life-events-chip" onClick={() => openBuilder('pension-inheritance')}>
            + pension / inheritance ↗
          </button>
          <button type="button" className="life-events-chip" onClick={() => openBuilder('custom')}>
            + more events ↗
          </button>
        </div>

        <div className="life-events-summary">
          <div className="life-events-summary__card">
            <div className="life-events-summary__label">Total outflows (all events)</div>
            <div className="life-events-summary__value">-{fmt(outflowsTotal)}</div>
          </div>
          <div className="life-events-summary__card">
            <div className="life-events-summary__label">Retirement date shift</div>
            <div className="life-events-summary__value">
              {shiftMonths > 0 ? `+${shiftMonths} months later` : 'No change'}
            </div>
          </div>
        </div>
      </div>

      <EventBuilderDrawer
        open={builderOpen}
        draft={builderDraft}
        projectionData={projectionData}
        onDraftChange={setBuilderDraft}
        onSave={saveBuilder}
        onClose={() => {
          setBuilderOpen(false)
          setBuilderDraft(null)
        }}
      />
    </section>
  )
}
