import { useMemo } from 'react'
import {
  getTaxVisaData,
  TAX_RATE_HOME_COUNTRY_NOTE,
  TAX_VISA_FOREIGN_INCOME_NOTE,
  TAX_VISA_TAB_DISCLAIMER_BODY,
  TAX_VISA_UNAVAILABLE_MESSAGE,
} from '../../../utils/taxVisa'
import {
  formatTextField,
  type CityDetailTabStaggerProps,
  staggerSectionProps,
} from './cityDetailTabUtils'
import './TaxVisaTab.scss'

type Props = CityDetailTabStaggerProps & {
  country: string
}

function TaxInfoCard({
  title,
  value,
  note,
}: {
  title: string
  value: string
  note?: string
}) {
  return (
    <article className="wtr-city-detail__card wtr-tax-visa-tab__card">
      <h3 className="wtr-city-detail__section-title">{title}</h3>
      <p className="wtr-city-detail__card-value">{value}</p>
      {note ? <p className="wtr-city-detail__card-note">{note}</p> : null}
    </article>
  )
}

export function TaxVisaTab({ country, staggerClassName, staggerStyle }: Props) {
  const data = useMemo(() => getTaxVisaData(country), [country])

  if (!data) {
    return (
      <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--tax-visa">
        <p
          className="wtr-tax-visa-tab__empty"
          {...staggerSectionProps(0, 'wtr-tax-visa-tab__empty', staggerClassName, staggerStyle)}
        >
          {TAX_VISA_UNAVAILABLE_MESSAGE}
        </p>
      </div>
    )
  }

  return (
    <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--tax-visa">
      <div
        className="wtr-city-detail__cards wtr-tax-visa-tab__cards"
        {...staggerSectionProps(0, 'wtr-tax-visa-tab__cards', staggerClassName, staggerStyle)}
      >
        <TaxInfoCard
          title="Tax rate"
          value={formatTextField(data.tax_rate_label)}
          note={TAX_RATE_HOME_COUNTRY_NOTE}
        />
        <TaxInfoCard
          title="Tax on foreign income"
          value={formatTextField(data.tax_summary)}
          note={TAX_VISA_FOREIGN_INCOME_NOTE}
        />
        <TaxInfoCard
          title="Key exemptions"
          value={formatTextField(data.key_exemptions)}
          note={data.us_tax_treaty ? 'US Tax Treaty applies' : undefined}
        />
        <TaxInfoCard
          title="Healthcare access"
          value={formatTextField(data.healthcare_notes)}
        />
      </div>

      <section
        className="wtr-tax-visa-tab__visa-section"
        aria-labelledby="wtr-tax-visa-visa-heading"
        {...staggerSectionProps(1, 'wtr-tax-visa-tab__visa-section', staggerClassName, staggerStyle)}
      >
        <h3 id="wtr-tax-visa-visa-heading" className="wtr-city-detail__section-title">
          Residency &amp; visa
        </h3>
        <dl className="wtr-tax-visa-tab__rows">
          <div className="wtr-tax-visa-tab__row">
            <dt className="wtr-tax-visa-tab__label">Visa / residency program</dt>
            <dd className="wtr-tax-visa-tab__value">{formatTextField(data.visa_name)}</dd>
          </div>
          <div className="wtr-tax-visa-tab__row">
            <dt className="wtr-tax-visa-tab__label">Income requirement</dt>
            <dd className="wtr-tax-visa-tab__value">
              {formatTextField(data.visa_income_requirement)}
            </dd>
          </div>
          <div className="wtr-tax-visa-tab__row">
            <dt className="wtr-tax-visa-tab__label">How it works</dt>
            <dd className="wtr-tax-visa-tab__value">{formatTextField(data.visa_summary)}</dd>
          </div>
        </dl>
      </section>

      <p
        className="wtr-tax-visa-tab__disclaimer"
        {...staggerSectionProps(2, 'wtr-tax-visa-tab__disclaimer', staggerClassName, staggerStyle)}
      >
        <strong>Sources</strong>: {TAX_VISA_TAB_DISCLAIMER_BODY}
      </p>
    </div>
  )
}
