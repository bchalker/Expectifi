import { useCallback, useMemo } from 'react'
import { CurrencyAmountInput } from './ui/CurrencyAmountInput'
import type { LifePlans, SellPlanOption, InheritanceExpectation } from '../lib/planStorage/life'
import { saveLifePlans } from '../lib/planStorage/life'
import './ConfigLifeTab.scss'

type Props = {
  plans: LifePlans
  onPlansChange: (next: LifePlans) => void
  currentYear: number
}

function Segment<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
}) {
  return (
    <div className="config-life-segment" role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`config-life-segment__btn${value === opt.value ? ' config-life-segment__btn--on' : ''}`}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ value, onChange, ariaLabel }: { value: boolean; onChange: (v: boolean) => void; ariaLabel: string }) {
  return (
    <Segment
      ariaLabel={ariaLabel}
      value={value ? 'yes' : 'no'}
      onChange={(v) => onChange(v === 'yes')}
      options={[
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ]}
    />
  )
}

function NumberStepper({
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  ariaLabel: string
}) {
  return (
    <div className="config-life-stepper" aria-label={ariaLabel}>
      <button type="button" className="config-life-stepper__btn" disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="config-life-stepper__value">{value}</span>
      <button type="button" className="config-life-stepper__btn" disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}

function YearSelect({
  value,
  from,
  to,
  onChange,
  id,
  label,
}: {
  value: number
  from: number
  to: number
  onChange: (y: number) => void
  id: string
  label: string
}) {
  const years = useMemo(() => {
    const a: number[] = []
    for (let y = from; y <= to; y++) a.push(y)
    return a
  }, [from, to])
  return (
    <div className="config-plan-field">
      <label className="config-plan-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="config-life-year-select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}

export function ConfigLifeTab({ plans, onPlansChange, currentYear }: Props) {
  const patch = useCallback(
    (partial: Partial<LifePlans>) => {
      const next = saveLifePlans(partial)
      onPlansChange(next)
    },
    [onPlansChange],
  )

  const h = plans.housing
  const f = plans.family
  const v = plans.vehicles
  const o = plans.other
  const yearMax = currentYear + 30

  return (
    <div className="config-life-tab">
      <section className="config-drawer-section">
        <h3 className="config-life-section-label">Your home</h3>
        <div className="config-plan-field">
          <span className="config-plan-question">Ownership status</span>
          <Segment
            ariaLabel="Home ownership"
            value={h.owns ? 'own' : 'rent'}
            onChange={(v) => patch({ housing: { ...h, owns: v === 'own' } })}
            options={[
              { value: 'rent', label: 'I rent' },
              { value: 'own', label: 'I own' },
            ]}
          />
        </div>
        {h.owns ? (
          <>
            <CurrencyAmountInput
              id="life-mortgage-balance"
              label="Mortgage balance remaining"
              value={h.mortgageBalance}
              onChange={(mortgageBalance) => patch({ housing: { ...h, mortgageBalance } })}
              placeholder="0"
              hint="Leave at $0 if your mortgage is paid off."
              externalPrefix
            />
            {h.mortgageBalance > 0 ? (
              <YearSelect
                id="life-mortgage-payoff"
                label="Estimated payoff year"
                value={h.mortgagePayoffYear}
                from={currentYear}
                to={yearMax}
                onChange={(mortgagePayoffYear) => patch({ housing: { ...h, mortgagePayoffYear } })}
              />
            ) : null}
            <div className="config-plan-field">
              <span className="config-plan-question">Do you plan to sell or downsize?</span>
              <Segment<SellPlanOption>
                ariaLabel="Plan to sell home"
                value={h.planToSell}
                onChange={(planToSell) => patch({ housing: { ...h, planToSell } })}
                options={[
                  { value: 'Yes', label: 'Yes' },
                  { value: 'Maybe', label: 'Maybe' },
                  { value: 'No', label: 'No' },
                ]}
              />
            </div>
            {h.planToSell === 'Yes' || h.planToSell === 'Maybe' ? (
              <>
                <YearSelect
                  id="life-sell-year"
                  label="Rough year you might sell"
                  value={h.sellYear}
                  from={currentYear}
                  to={yearMax}
                  onChange={(sellYear) => patch({ housing: { ...h, sellYear } })}
                />
                <CurrencyAmountInput
                  id="life-sale-proceeds"
                  label="Estimated sale proceeds"
                  value={h.saleProceeds}
                  onChange={(saleProceeds) => patch({ housing: { ...h, saleProceeds } })}
                  hint="We'll suggest this as a one-time inflow in your Life Events."
                  externalPrefix
                />
              </>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="config-drawer-section">
        <h3 className="config-life-section-label">Your family</h3>
        <div className="config-plan-field">
          <span className="config-plan-question">Marital status</span>
          <Segment
            ariaLabel="Marital status"
            value={f.married ? 'married' : 'single'}
            onChange={(v) => patch({ family: { ...f, married: v === 'married' } })}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'married', label: 'Married / partnered' },
            ]}
          />
        </div>
        <div className="config-plan-field">
          <span className="config-plan-question">Do you have children or grandchildren?</span>
          <Toggle
            ariaLabel="Has children or grandchildren"
            value={f.hasChildren}
            onChange={(hasChildren) => patch({ family: { ...f, hasChildren } })}
          />
        </div>
        {f.hasChildren ? (
          <>
            <div className="config-plan-field">
              <span className="config-plan-question">
                Number of children / grandchildren you may support financially
              </span>
              <NumberStepper
                ariaLabel="Dependent count"
                value={f.dependentCount}
                min={0}
                max={10}
                onChange={(dependentCount) => patch({ family: { ...f, dependentCount } })}
              />
            </div>
            <div className="config-plan-field">
              <label className="config-plan-label" htmlFor="life-dependent-ages">
                Ages (optional)
              </label>
              <input
                id="life-dependent-ages"
                type="text"
                className="config-life-text-input"
                placeholder="e.g. 8, 14, 22"
                value={f.dependentAges.join(', ')}
                onChange={(e) => {
                  const dependentAges = e.target.value
                    .split(/[,;\s]+/)
                    .map((s) => parseInt(s.trim(), 10))
                    .filter((n) => Number.isFinite(n) && n >= 0)
                  patch({ family: { ...f, dependentAges } })
                }}
              />
              <p className="config-plan-age-hint">
                Helps us estimate when tuition or support events might start.
              </p>
            </div>
          </>
        ) : null}
        <div className="config-plan-field">
          <span className="config-plan-question">
            Are you currently supporting a parent or family member financially?
          </span>
          <Toggle
            ariaLabel="Supporting a parent"
            value={f.supportingParent}
            onChange={(supportingParent) => patch({ family: { ...f, supportingParent } })}
          />
        </div>
        {f.supportingParent ? (
          <>
            <CurrencyAmountInput
              id="life-parent-support"
              label="Monthly support amount"
              value={f.parentSupportAmount}
              onChange={(parentSupportAmount) => patch({ family: { ...f, parentSupportAmount } })}
              externalPrefix
              externalSuffix="/mo"
            />
            <div className="config-plan-field">
              <span className="config-plan-question">How many more years do you expect to help?</span>
              <NumberStepper
                ariaLabel="Parent support years"
                value={f.parentSupportYears}
                min={1}
                max={20}
                onChange={(parentSupportYears) => patch({ family: { ...f, parentSupportYears } })}
              />
            </div>
          </>
        ) : null}
      </section>

      <section className="config-drawer-section">
        <h3 className="config-life-section-label">Your vehicles</h3>
        <div className="config-plan-field">
          <span className="config-plan-question">How many vehicles do you own?</span>
          <NumberStepper
            ariaLabel="Vehicle count"
            value={v.count}
            min={0}
            max={6}
            onChange={(count) => patch({ vehicles: { ...v, count } })}
          />
        </div>
        {v.count > 0 ? (
          <YearSelect
            id="life-oldest-vehicle"
            label="Year of your oldest vehicle"
            value={v.oldestYear}
            from={1990}
            to={currentYear}
            onChange={(oldestYear) => patch({ vehicles: { ...v, oldestYear } })}
          />
        ) : null}
        {v.count > 0 ? (
          <p className="config-plan-age-hint">
            We'll suggest a replacement event when your vehicle is getting long in the tooth.
          </p>
        ) : null}
      </section>

      <section className="config-drawer-section config-drawer-section--last">
        <h3 className="config-life-section-label">Other things we should know</h3>
        <div className="config-plan-field">
          <span className="config-plan-question">Do you own rental property?</span>
          <Toggle
            ariaLabel="Own rental property"
            value={o.hasRental}
            onChange={(hasRental) => patch({ other: { ...o, hasRental } })}
          />
        </div>
        {o.hasRental ? (
          <>
            <CurrencyAmountInput
              id="life-rental-income"
              label="Monthly rental income"
              value={o.rentalIncome}
              onChange={(rentalIncome) => patch({ other: { ...o, rentalIncome } })}
              externalPrefix
              externalSuffix="/mo"
            />
            <YearSelect
              id="life-rental-start"
              label="When did / will it start?"
              value={o.rentalStartYear}
              from={currentYear - 5}
              to={yearMax}
              onChange={(rentalStartYear) => patch({ other: { ...o, rentalStartYear } })}
            />
          </>
        ) : null}
        <div className="config-plan-field">
          <span className="config-plan-question">Do you expect to receive an inheritance?</span>
          <Segment<InheritanceExpectation>
            ariaLabel="Expect inheritance"
            value={o.expectsInheritance}
            onChange={(expectsInheritance) => patch({ other: { ...o, expectsInheritance } })}
            options={[
              { value: 'Yes', label: 'Yes' },
              { value: 'Possibly', label: 'Possibly' },
              { value: 'No', label: 'No' },
            ]}
          />
        </div>
        {o.expectsInheritance !== 'No' ? (
          <>
            <CurrencyAmountInput
              id="life-inheritance-amt"
              label="Rough amount (optional)"
              value={o.inheritanceAmount}
              onChange={(inheritanceAmount) => patch({ other: { ...o, inheritanceAmount } })}
              placeholder="Estimate is fine"
              externalPrefix
            />
            <YearSelect
              id="life-inheritance-year"
              label="Rough year (optional)"
              value={o.inheritanceYear}
              from={currentYear}
              to={yearMax}
              onChange={(inheritanceYear) => patch({ other: { ...o, inheritanceYear } })}
            />
          </>
        ) : null}
        <div className="config-plan-field">
          <span className="config-plan-question">Do you tithe or give regularly to charity?</span>
          <Toggle
            ariaLabel="Tithes or charity"
            value={o.tithes}
            onChange={(tithes) => patch({ other: { ...o, tithes } })}
          />
        </div>
        {o.tithes ? (
          <CurrencyAmountInput
            id="life-tithe-amt"
            label="Monthly giving amount"
            value={o.titheAmount}
            onChange={(titheAmount) => patch({ other: { ...o, titheAmount } })}
            externalPrefix
            externalSuffix="/mo"
          />
        ) : null}
      </section>
    </div>
  )
}
