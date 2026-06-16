import { useMemo } from 'react'
import { DetailPanelCard } from '../../ui/DetailPanelCard'
import { PanelHeadsUpCallout } from '../../ui/PanelHeadsUpCallout'
import {
  getTaxVisaData,
  getTaxVisaPanelHeadsUp,
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

function TaxNarrativeCard({
  title,
  value,
  why,
}: {
  title: string
  value: string
  why?: string
}) {
  return (
    <DetailPanelCard as="article" className="wtr-tax-visa-tab__card">
      <h3 className="wtr-city-detail__section-title">{title}</h3>
      <p className="wtr-city-detail__card-value">{value}</p>
      {why ? (
        <p className="wtr-tax-visa-tab__why">
          <span className="wtr-tax-visa-tab__why-label">Why it matters for you:</span> {why}
        </p>
      ) : null}
    </DetailPanelCard>
  )
}

export function TaxVisaTab({ country, staggerClassName, staggerStyle }: Props) {
  const data = useMemo(() => getTaxVisaData(country), [country])
  const panelHeadsUp = useMemo(
    () => getTaxVisaPanelHeadsUp(country, data),
    [country, data],
  )

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
        className="wtr-tax-visa-tab__cards"
        {...staggerSectionProps(0, 'wtr-tax-visa-tab__cards', staggerClassName, staggerStyle)}
      >
        <TaxNarrativeCard
          title="Tax rate"
          value={formatTextField(data.tax_rate_label)}
          why={data.tax_rate_why}
        />
        <TaxNarrativeCard
          title="Tax on foreign income"
          value={formatTextField(data.tax_summary)}
          why={data.tax_summary_why}
        />
        <TaxNarrativeCard
          title="Key exemptions"
          value={formatTextField(data.key_exemptions)}
          why={data.key_exemptions_why}
        />
        <TaxNarrativeCard
          title="Healthcare access"
          value={formatTextField(data.healthcare_notes)}
          why={data.healthcare_notes_why}
        />
      </div>

      <DetailPanelCard
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
            {data.visa_summary_why ? (
              <dd className="wtr-tax-visa-tab__why wtr-tax-visa-tab__why--row">
                <span className="wtr-tax-visa-tab__why-label">Why it matters for you:</span>{' '}
                {data.visa_summary_why}
              </dd>
            ) : null}
          </div>
        </dl>
      </DetailPanelCard>

      <PanelHeadsUpCallout
        className="wtr-tax-visa-tab__heads-up"
        {...staggerSectionProps(2, undefined, staggerClassName, staggerStyle)}
      >
        {panelHeadsUp}
      </PanelHeadsUpCallout>

      <p
        className="wtr-tax-visa-tab__disclaimer"
        {...staggerSectionProps(3, 'wtr-tax-visa-tab__disclaimer', staggerClassName, staggerStyle)}
      >
        <strong>Sources</strong>: {TAX_VISA_TAB_DISCLAIMER_BODY}
      </p>
    </div>
  )
}
