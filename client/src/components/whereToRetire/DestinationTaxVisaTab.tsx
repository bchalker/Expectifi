import { useMemo } from 'react'
import { getDestinationTaxVisaContent } from '../../lib/whereToRetire/destinationTaxVisaContent'
import { TAX_DETAIL_DISCLAIMER } from '../../data/retirementTaxDetail'
import './DestinationTaxVisaTab.scss'

type Props = {
  country: string
}

export function DestinationTaxVisaTab({ country }: Props) {
  const content = useMemo(() => getDestinationTaxVisaContent(country), [country])

  if (!content) {
    return (
      <p className="wtr-tax-visa__empty">
        Tax and residency data is not available for this destination yet.
      </p>
    )
  }

  const taxRows = content.rows.filter((r) => r.id === 'taxRate' || r.id === 'exemptions')
  const visaRows = content.rows.filter((r) => r.id === 'visa' || r.id === 'healthcare')

  return (
    <div className="wtr-tax-visa">
      <section className="wtr-tax-visa__section" aria-labelledby="wtr-tax-visa-tax-heading">
        <h3 id="wtr-tax-visa-tax-heading" className="wtr-tax-visa__section-title">
          {content.taxSectionTitle}
        </h3>
        <dl className="wtr-tax-visa__rows">
          {taxRows.map((row) => (
            <div key={row.id} className="wtr-tax-visa__row">
              <dt className="wtr-tax-visa__label">
                {row.label}
                {row.sublabel ? <span className="wtr-tax-visa__sublabel">{row.sublabel}</span> : null}
              </dt>
              <dd className="wtr-tax-visa__value">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="wtr-tax-visa__section" aria-labelledby="wtr-tax-visa-visa-heading">
        <h3 id="wtr-tax-visa-visa-heading" className="wtr-tax-visa__section-title">
          {content.visaSectionTitle}
        </h3>
        <dl className="wtr-tax-visa__rows">
          {visaRows.map((row) => (
            <div key={row.id} className="wtr-tax-visa__row">
              <dt className="wtr-tax-visa__label">{row.label}</dt>
              <dd className="wtr-tax-visa__value">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="wtr-tax-visa__disclaimer">{TAX_DETAIL_DISCLAIMER}</p>
    </div>
  )
}
