import { useEffect, useState } from 'react'
import { AppSelect } from '../ui/AppSelect'
import {
  applyMapFiltersBudgetPreferences,
  type MapFilters,
} from '../../lib/whereToRetire/cityMapScoring'
import { DEFAULT_BUDGET_PREFERENCES, type HousingTier } from '../../utils/costOfLiving'
import { WtrFilterToggleBox } from './WtrFilterFieldChrome'
import './BudgetPanel.scss'

const HOUSING_OPTIONS: { id: HousingTier; label: string }[] = [
  { id: '1br_outside', label: '1BR, outside center' },
  { id: '1br_centre', label: '1BR, city center' },
  { id: '3br_outside', label: '3BR, outside center' },
  { id: '3br_centre', label: '3BR, city center' },
]

const DISCRETIONARY_TOGGLES = [
  { key: 'includeCasualDining' as const, label: 'Casual dining' },
  { key: 'includeUpscaleDining' as const, label: 'Upscale dining' },
  { key: 'includeCoffee' as const, label: 'Coffee shops' },
  { key: 'includeAlcohol' as const, label: 'Alcohol' },
  { key: 'includeGym' as const, label: 'Gym membership' },
  { key: 'includeCinema' as const, label: 'Entertainment / movies' },
  { key: 'includeTaxi' as const, label: 'Taxis / rideshare' },
  { key: 'includeMobile' as const, label: 'Cell phone plan' },
  { key: 'includeClothing' as const, label: 'Clothing & shoes' },
]

type Props = {
  filters: MapFilters
  onChange: (filters: MapFilters) => void
}

function parseHealthInsUsd(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, '').trim())
  if (!Number.isFinite(n) || n < 0) return DEFAULT_BUDGET_PREFERENCES.healthInsuranceMonthlyUsd
  return Math.round(n)
}

function FilterGroupCard({
  title,
  subtitle,
  children,
}: {
  title?: string
  subtitle?: string
  children: React.ReactNode
}) {
  const titleId = title
    ? `wtr-budget-group-${title.replace(/\s+/g, '-').toLowerCase()}`
    : undefined
  return (
    <section
      className="wtr-map-filters__group-card"
      {...(titleId ? { 'aria-labelledby': titleId } : {})}
    >
      {title ? (
        <h3 id={titleId} className="wtr-map-filters__group-title">
          {title}
        </h3>
      ) : null}
      {subtitle ? (
        <p className="wtr-map-filters__group-subtitle">{subtitle}</p>
      ) : null}
      <div className="wtr-map-filters__group-stack">{children}</div>
    </section>
  )
}

export function WtrBudgetTabContent({ filters, onChange }: Props) {
  const prefs = filters.budgetPreferences

  const updatePrefs = (patch: Partial<typeof prefs>) => {
    onChange(applyMapFiltersBudgetPreferences(filters, { ...prefs, ...patch }))
  }

  return (
    <div className="wtr-map-filters__controls wtr-budget-panel">
      <FilterGroupCard>
        <AppSelect
          className="wtr-map-filters__field"
          ariaLabel="Housing"
          label="Housing"
          labelClassName="wtr-map-filters__field-label"
          value={prefs.housing}
          options={HOUSING_OPTIONS.map((opt) => ({ id: opt.id, label: opt.label }))}
          onChange={(id) => updatePrefs({ housing: id as HousingTier })}
          popoverClassName="wtr-map-filters__select-popover"
          listClassName="wtr-map-filters__select-list"
        />
      </FilterGroupCard>

      <FilterGroupCard title="Healthcare">
        <HealthInsuranceField prefs={prefs} onUpdate={updatePrefs} />
      </FilterGroupCard>

      <FilterGroupCard
        title="Discretionary spending"
        subtitle="Rent, groceries, utilities, and transit pass are always included"
      >
        <div className="wtr-budget-panel__toggle-list">
          {DISCRETIONARY_TOGGLES.map((item) => (
            <WtrFilterToggleBox
              key={item.key}
              label={item.label}
              pressed={prefs[item.key]}
              onToggle={() => updatePrefs({ [item.key]: !prefs[item.key] })}
            />
          ))}
          <WtrFilterToggleBox
            label="Include incidentals"
            subtitle="Personal care, household items, gifts"
            pressed={prefs.includeIncidentals}
            onToggle={() => updatePrefs({ includeIncidentals: !prefs.includeIncidentals })}
          />
        </div>
      </FilterGroupCard>
    </div>
  )
}

function HealthInsuranceField({
  prefs,
  onUpdate,
}: {
  prefs: MapFilters['budgetPreferences']
  onUpdate: (patch: Partial<MapFilters['budgetPreferences']>) => void
}) {
  const [healthDraft, setHealthDraft] = useState(() =>
    String(Math.round(prefs.healthInsuranceMonthlyUsd)),
  )

  useEffect(() => {
    setHealthDraft(String(Math.round(prefs.healthInsuranceMonthlyUsd)))
  }, [prefs.healthInsuranceMonthlyUsd])

  const healthEmbedded = (
    <label className="wtr-map-filters__health-amount-inline">
      <span className="wtr-map-filters__toggle-field-label">Est.</span>
      <span className="wtr-map-filters__health-amount-prefix" aria-hidden>
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        className="wtr-map-filters__health-amount-input"
        aria-label="Monthly health insurance estimate"
        value={healthDraft}
        onChange={(e) => setHealthDraft(e.target.value)}
        onBlur={() => {
          const next = parseHealthInsUsd(healthDraft)
          setHealthDraft(String(next))
          onUpdate({ healthInsuranceMonthlyUsd: next })
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur()
          }
        }}
      />
      <span className="wtr-map-filters__health-amount-suffix">/mo</span>
    </label>
  )

  return (
    <WtrFilterToggleBox
      label="Include health insurance estimate"
      pressed={prefs.includeHealthInsurance}
      onToggle={() =>
        onUpdate({
          includeHealthInsurance: !prefs.includeHealthInsurance,
          healthInsuranceMonthlyUsd: prefs.includeHealthInsurance
            ? prefs.healthInsuranceMonthlyUsd
            : prefs.healthInsuranceMonthlyUsd ||
              DEFAULT_BUDGET_PREFERENCES.healthInsuranceMonthlyUsd,
        })
      }
      embedded={healthEmbedded}
    />
  )
}
