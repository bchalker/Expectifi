import { useMemo, type ReactNode } from 'react'
import { IconHeart, IconId, IconReceiptTax } from '@tabler/icons-react'
import {
  TAX_DETAIL_DISCLAIMER,
  US_FEDERAL_NOTE,
  type RetirementTaxDetail,
} from '../../data/retirementTaxDetail'
import { getCountryTaxForCityCountry } from '../../lib/whereToRetire/countryTaxForCity'
import { formatUsd } from '../../utils/costOfLiving'
import { TaxRateCell } from './TaxRateCell'
import './TaxRateCell.scss'
import './DestinationTaxSection.scss'

type Props = {
  country: string
  monthlyIncome: number
}

const CARD_ICON_SIZE = 24

function TaxDetailCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <article className="wtr-dest-panel__card wtr-dest-tax__card">
      <span className="wtr-dest-panel__card-icon-top">{icon}</span>
      <h4 className="wtr-dest-panel__card-title wtr-dest-panel__card-title--centered">{title}</h4>
      <div className="wtr-dest-tax__card-body">{children}</div>
    </article>
  )
}

function IncomeBreakdownTable({ detail }: { detail: RetirementTaxDetail }) {
  const rows = [
    { label: 'Social Security', value: detail.retirementIncomeBreakdown.socialSecurity },
    { label: '401(k) / IRA', value: detail.retirementIncomeBreakdown.retirement401k },
    { label: 'Pension', value: detail.retirementIncomeBreakdown.pension },
    { label: 'Investment income', value: detail.retirementIncomeBreakdown.investmentIncome },
  ]

  return (
    <table className="wtr-tax-cell__table">
      <caption className="wtr-tax-cell__table-caption">How retirement income is taxed locally</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TaxFlags({ detail }: { detail: RetirementTaxDetail }) {
  const flags = [
    detail.usFederalApplies ? US_FEDERAL_NOTE : null,
    detail.taxTreatyWithUS ? 'US tax treaty may apply' : null,
    detail.foreignTaxCreditApplies ? 'Foreign Tax Credit may reduce double taxation' : null,
    detail.territorialSystem ? 'Territorial tax system — foreign income often exempt locally' : null,
  ].filter(Boolean)

  if (!flags.length) return null

  return (
    <ul className="wtr-dest-tax__flags">
      {flags.map((flag) => (
        <li key={flag}>{flag}</li>
      ))}
    </ul>
  )
}

export function DestinationTaxSection({ country, monthlyIncome }: Props) {
  const entry = useMemo(() => getCountryTaxForCityCountry(country), [country])

  if (!entry) {
    return (
      <p className="wtr-dest-tax__empty">
        Tax planning data is not available for this destination yet.
      </p>
    )
  }

  const detail = entry.retirementTaxDetail
  const localTax = monthlyIncome * entry.effectiveRetirementRate
  const afterTax = monthlyIncome - localTax

  return (
    <div className="wtr-dest-panel__cards wtr-dest-tax">
      <article className="wtr-dest-panel__card wtr-dest-panel__card--stat wtr-dest-tax__hero">
        <TaxRateCell detail={detail} isUsState={false} noStateIncomeTax={false} />
        <dl className="wtr-dest-panel__card-rows wtr-dest-tax__hero-rows">
          <div className="wtr-dest-panel__card-row">
            <dt className="wtr-dest-panel__card-row-label">Your gross income</dt>
            <dd className="wtr-dest-panel__card-row-value">{formatUsd(monthlyIncome)}/mo</dd>
          </div>
          <div className="wtr-dest-panel__card-row">
            <dt className="wtr-dest-panel__card-row-label">Est. local tax</dt>
            <dd className="wtr-dest-panel__card-row-value">{formatUsd(localTax)}/mo</dd>
          </div>
          <div className="wtr-dest-panel__card-row">
            <dt className="wtr-dest-panel__card-row-label">Est. after-tax income</dt>
            <dd className="wtr-dest-panel__card-row-value wtr-dest-tax__after-tax">
              {formatUsd(afterTax)}/mo
            </dd>
          </div>
        </dl>
      </article>

      <TaxDetailCard
        title="Local tax rate"
        icon={<IconReceiptTax size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />}
      >
        <p className="wtr-dest-tax__note">{detail.localRateLabel}</p>
        {detail.effectiveCombinedNote ? (
          <p className="wtr-tax-cell__callout">{detail.effectiveCombinedNote}</p>
        ) : null}
        <IncomeBreakdownTable detail={detail} />
        <TaxFlags detail={detail} />
        {detail.plainLanguageSummary ? (
          <p className="wtr-tax-cell__summary-text">{detail.plainLanguageSummary}</p>
        ) : null}
      </TaxDetailCard>

      <TaxDetailCard
        title="Key exemptions"
        icon={<IconReceiptTax size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />}
      >
        <p className="wtr-dest-tax__note">{entry.rateDescription}</p>
        <p className="wtr-dest-tax__note">{entry.usExpatNotes}</p>
      </TaxDetailCard>

      <TaxDetailCard
        title="Visa / residency"
        icon={<IconId size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />}
      >
        <p className="wtr-dest-tax__note">{entry.visaNotes}</p>
      </TaxDetailCard>

      <TaxDetailCard
        title="Healthcare"
        icon={<IconHeart size={CARD_ICON_SIZE} stroke={1.5} aria-hidden />}
      >
        <p className="wtr-dest-tax__note">{entry.healthcareNotes}</p>
      </TaxDetailCard>

      <p className="wtr-tax-cell__disclaimer wtr-dest-tax__disclaimer">{TAX_DETAIL_DISCLAIMER}</p>
    </div>
  )
}
