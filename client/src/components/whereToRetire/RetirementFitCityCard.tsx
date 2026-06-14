import { useState } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import {
  calcFit,
  cityFitCaveats,
  type RetirementFitResult,
} from '../../lib/retirementFormulas'
import { mapIncomeFitDisplayForCity } from '../../lib/whereToRetire/mapIncomeFit'
import type { RetirementCityRecord } from '../../lib/retirementDestinations'
import { formatUsd } from '../../utils/costOfLiving'
import { fmtMon } from '../../utils/format'
import { WtrIncomeFitBadges } from './WtrIncomeFitBadges'
import { CountryFlag } from '../ui/CountryFlag'
import './RetirementFitCalculator.scss'

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function barPct(value: number, max: number): number {
  if (max <= 0) return 0
  return Math.min(100, Math.round((value / max) * 100))
}

type Props = {
  city: RetirementCityRecord
  grossMonthly: number
  includeHealthIns: boolean
  healthInsMonthlyUsd: number
  fitScore: number
}

function FormulaPanel({
  city,
  grossMonthly,
  includeHealthIns,
  fit,
}: {
  city: RetirementCityRecord
  grossMonthly: number
  includeHealthIns: boolean
  fit: RetirementFitResult
}) {
  const taxPct = Math.round(fit.taxRate * 100)
  const qol = city.quality_of_life

  return (
    <div className="wtr-fit-card__formula">
      <table className="wtr-fit-card__formula-table">
        <tbody>
          <tr>
            <td>Gross monthly income</td>
            <td className="tabular-nums">{formatUsd(grossMonthly)}</td>
          </tr>
          <tr>
            <td>Local tax ({taxPct}%)</td>
            <td className="tabular-nums">−{formatUsd(fit.taxAmount)}</td>
          </tr>
          <tr className="wtr-fit-card__formula-total">
            <td>Net after local tax</td>
            <td className="tabular-nums">{formatUsd(fit.netIncome)}</td>
          </tr>
          <tr>
            <td>Rent (1BR outside center)</td>
            <td className="tabular-nums">−{formatUsd(fit.lineItems.rent)}</td>
          </tr>
          <tr>
            <td>Utilities + internet</td>
            <td className="tabular-nums">−{formatUsd(fit.lineItems.utilities)}</td>
          </tr>
          <tr>
            <td>Transport (monthly pass)</td>
            <td className="tabular-nums">−{formatUsd(fit.lineItems.transport)}</td>
          </tr>
          <tr>
            <td>Food (45 meals, inexpensive)</td>
            <td className="tabular-nums">−{formatUsd(fit.lineItems.meals)}</td>
          </tr>
          {includeHealthIns ? (
            <tr>
              <td>Health insurance (est.)</td>
              <td className="tabular-nums">−{formatUsd(fit.lineItems.healthIns)}</td>
            </tr>
          ) : null}
          <tr className="wtr-fit-card__formula-total">
            <td>Total monthly outflow</td>
            <td className="tabular-nums">{formatUsd(fit.trueCOL)}</td>
          </tr>
          <tr className="wtr-fit-card__formula-surplus">
            <td>Real monthly surplus</td>
            <td className="tabular-nums">
              {fit.surplus >= 0 ? '+' : '−'}
              {formatUsd(Math.abs(fit.surplus))}
            </td>
          </tr>
        </tbody>
      </table>

      <dl className="wtr-fit-card__meta-grid">
        <div>
          <dt>Tax treaty with US</dt>
          <dd>{city.tax.us_tax_treaty ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt>Visa income required</dt>
          <dd>
            {city.visa.income_requirement_monthly_usd > 0
              ? fmtMon(city.visa.income_requirement_monthly_usd)
              : 'None stated'}
          </dd>
        </div>
        <div>
          <dt>Healthcare index</dt>
          <dd className="tabular-nums">
            {qol.healthcare != null ? `${Math.round(qol.healthcare)}/100` : '—'}
          </dd>
        </div>
        <div>
          <dt>QoL index</dt>
          <dd className="tabular-nums">
            {qol.index != null ? `${Math.round(qol.index)}/220` : '—'}
          </dd>
        </div>
      </dl>

      <p className="wtr-fit-card__exemption">{truncate(city.tax.key_exemptions, 120)}</p>
      <p className="wtr-fit-card__disclaimer">
        US federal tax still applies on worldwide income. Not tax advice.
      </p>
    </div>
  )
}

export function RetirementFitCityCard({
  city,
  grossMonthly,
  includeHealthIns,
  healthInsMonthlyUsd,
  fitScore,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const fit = calcFit(city, grossMonthly, includeHealthIns, healthInsMonthlyUsd)
  const caveats = cityFitCaveats(city, grossMonthly, fit)
  const fitBadges = mapIncomeFitDisplayForCity(city.city, city.country, grossMonthly, {
    includeHealthIns,
    healthInsMonthlyUsd,
  })
  const netPct = barPct(fit.netIncome, grossMonthly)
  const colPct = barPct(fit.trueCOL, grossMonthly)
  const colTone =
    fit.trueCOL / grossMonthly <= 0.5
      ? 'good'
      : fit.trueCOL / grossMonthly <= 0.75
        ? 'mid'
        : 'bad'

  return (
    <article className="wtr-fit-card">
      <button
        type="button"
        className="wtr-fit-card__main"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <header className="wtr-fit-card__head">
          <CountryFlag iso={city.country_iso} size="s" className="wtr-fit-card__flag" />
          <div className="wtr-fit-card__titles">
            <span className="wtr-fit-card__city">{city.city}</span>
            <span className="wtr-fit-card__country">{city.country}</span>
          </div>
          <div className="wtr-fit-card__badges">
            {fitBadges ? <WtrIncomeFitBadges fit={fitBadges} /> : null}
            <span className="wtr-fit-card__score tabular-nums" aria-label={`Fit score ${fitScore}`}>
              {fitScore}
            </span>
          </div>
          <IconChevronDown
            size={18}
            stroke={1.5}
            className={['wtr-fit-card__chevron', expanded && 'wtr-fit-card__chevron--open']
              .filter(Boolean)
              .join(' ')}
            aria-hidden
          />
        </header>

        {caveats.length > 0 ? (
          <ul className="wtr-fit-card__caveats">
            {caveats.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}

        <div className="wtr-fit-card__bars">
          <div className="wtr-fit-card__bar-row">
            <span className="wtr-fit-card__bar-label">Net after tax</span>
            <div className="wtr-fit-card__bar-track" role="presentation">
              <div
                className="wtr-fit-card__bar-fill wtr-fit-card__bar-fill--income"
                style={{ width: `${netPct}%` }}
              />
            </div>
            <span className="wtr-fit-card__bar-value tabular-nums">{formatUsd(fit.netIncome)}</span>
          </div>
          <div className="wtr-fit-card__bar-row">
            <span className="wtr-fit-card__bar-label">Cost of living</span>
            <div className="wtr-fit-card__bar-track" role="presentation">
              <div
                className={`wtr-fit-card__bar-fill wtr-fit-card__bar-fill--col-${colTone}`}
                style={{ width: `${colPct}%` }}
              />
            </div>
            <span className="wtr-fit-card__bar-value tabular-nums">{formatUsd(fit.trueCOL)}</span>
          </div>
        </div>

        <div className="wtr-fit-card__surplus-row">
          <span className="wtr-fit-card__surplus-label">Real monthly surplus</span>
          <span
            className={[
              'wtr-fit-card__surplus-value',
              'tabular-nums',
              fit.surplus >= 0 ? 'wtr-fit-card__surplus-value--pos' : 'wtr-fit-card__surplus-value--neg',
            ].join(' ')}
          >
            {fit.surplus >= 0 ? '+' : '−'}
            {formatUsd(Math.abs(fit.surplus))}
          </span>
          {!fit.visaQualifies ? (
            <span className="wtr-fit-card__visa-warn">Visa income not met</span>
          ) : null}
        </div>
      </button>

      {expanded ? (
        <FormulaPanel
          city={city}
          grossMonthly={grossMonthly}
          includeHealthIns={includeHealthIns}
          fit={fit}
        />
      ) : null}
    </article>
  )
}
