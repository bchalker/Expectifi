import { useMemo } from "react";
import { PanelHeadsUpCallout } from "../../ui/PanelHeadsUpCallout";
import { DataFreshnessNote } from "../../ui/DataFreshnessNote";
import {
  getTaxVisaData,
  getTaxVisaLastUpdated,
  getTaxVisaPanelHeadsUp,
  TAX_VISA_TAB_DISCLAIMER_BODY,
  TAX_VISA_UNAVAILABLE_MESSAGE,
  type TaxVisaCountryData,
} from "../../../utils/taxVisa";
import {
  ITALY_ART_24_TER_KEY_EXEMPTIONS,
  ITALY_ART_24_TER_TAX_RATE_LABEL,
  ITALY_ART_24_TER_TAX_SUMMARY,
  isItalyArt24TerEligibleCity,
} from "../../../lib/calc/italyTax";
import {
  formatTextField,
  type CityDetailTabStaggerProps,
  staggerSectionProps,
} from "./cityDetailTabUtils";
import "./TaxVisaTab.scss";

type Props = CityDetailTabStaggerProps & {
  country: string;
  city?: string;
};

function applyItalyCityTaxOverrides(
  country: string,
  city: string | undefined,
  data: TaxVisaCountryData,
): TaxVisaCountryData {
  if (country.trim() !== "Italy" || !isItalyArt24TerEligibleCity(city)) {
    return data;
  }
  return {
    ...data,
    tax_rate_label: ITALY_ART_24_TER_TAX_RATE_LABEL,
    tax_summary: ITALY_ART_24_TER_TAX_SUMMARY,
    key_exemptions: ITALY_ART_24_TER_KEY_EXEMPTIONS,
    top_reason: ITALY_ART_24_TER_TAX_RATE_LABEL,
    tax_rate_why:
      "This comune meets the Puglia + ≤30k tests for Article 24-ter — the 7% rate is the planning figure here, not standard IRPEF.",
    tax_summary_why:
      "You still need a qualifying foreign pension and a clean five-year non-residency history to elect the regime — confirm with a cross-border advisor before relocating.",
    key_exemptions_why:
      "Standard progressive IRPEF still applies in Italy’s major cities; this town is one of the catalog exceptions that can elect 7%.",
  };
}

function TaxNarrativeCard({
  title,
  value,
  why,
}: {
  title: string;
  value: string;
  why?: string;
}) {
  return (
    <article className="detail-panel-card wtr-tax-visa-tab__card">
      <h3 className="wtr-city-detail__section-title">{title}</h3>
      <p className="wtr-city-detail__card-value">{value}</p>
      {why ? (
        <p className="wtr-tax-visa-tab__why">
          <span className="wtr-tax-visa-tab__why-label">
            Why it matters for you:
          </span>{" "}
          {why}
        </p>
      ) : null}
    </article>
  );
}

export function TaxVisaTab({
  country,
  city,
  staggerClassName,
  staggerStyle,
}: Props) {
  const data = useMemo(() => {
    const base = getTaxVisaData(country);
    if (!base) return null;
    return applyItalyCityTaxOverrides(country, city, base);
  }, [country, city]);
  const panelHeadsUp = useMemo(
    () => getTaxVisaPanelHeadsUp(country, data),
    [country, data],
  );

  if (!data) {
    return (
      <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--tax-visa">
        <p
          className="wtr-tax-visa-tab__empty"
          {...staggerSectionProps(
            0,
            "wtr-tax-visa-tab__empty",
            staggerClassName,
            staggerStyle,
          )}
        >
          {TAX_VISA_UNAVAILABLE_MESSAGE}
        </p>
      </div>
    );
  }

  return (
    <div className="wtr-city-detail__tab-content wtr-city-detail__tab-content--tax-visa">
      <div
        className="wtr-tax-visa-tab__cards"
        {...staggerSectionProps(
          0,
          "wtr-tax-visa-tab__cards",
          staggerClassName,
          staggerStyle,
        )}
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

      <section
        aria-labelledby="wtr-tax-visa-visa-heading"
        {...staggerSectionProps(
          1,
          "detail-panel-card wtr-tax-visa-tab__visa-section",
          staggerClassName,
          staggerStyle,
        )}
      >
        <h3
          id="wtr-tax-visa-visa-heading"
          className="wtr-city-detail__section-title"
        >
          Residency &amp; visa
        </h3>
        <dl className="wtr-tax-visa-tab__rows">
          <div className="wtr-tax-visa-tab__row">
            <dt className="wtr-tax-visa-tab__label">
              Visa / residency program
            </dt>
            <dd className="wtr-tax-visa-tab__value">
              {formatTextField(data.visa_name)}
            </dd>
          </div>
          <div className="wtr-tax-visa-tab__row">
            <dt className="wtr-tax-visa-tab__label">Income requirement</dt>
            <dd className="wtr-tax-visa-tab__value">
              {formatTextField(data.visa_income_requirement)}
            </dd>
          </div>
          <div className="wtr-tax-visa-tab__row">
            <dt className="wtr-tax-visa-tab__label">How it works</dt>
            <dd className="wtr-tax-visa-tab__value">
              {formatTextField(data.visa_summary)}
            </dd>
            {data.visa_summary_why ? (
              <dd className="wtr-tax-visa-tab__why wtr-tax-visa-tab__why--row">
                <span className="wtr-tax-visa-tab__why-label">
                  Why it matters for you:
                </span>{" "}
                {data.visa_summary_why}
              </dd>
            ) : null}
          </div>
        </dl>
      </section>

      <PanelHeadsUpCallout
        className="wtr-tax-visa-tab__heads-up"
        {...staggerSectionProps(2, undefined, staggerClassName, staggerStyle)}
      >
        {panelHeadsUp}
      </PanelHeadsUpCallout>

      <p
        className="wtr-tax-visa-tab__disclaimer"
        {...staggerSectionProps(
          3,
          "wtr-tax-visa-tab__disclaimer",
          staggerClassName,
          staggerStyle,
        )}
      >
        <strong>Sources</strong>: {TAX_VISA_TAB_DISCLAIMER_BODY}
      </p>
      <div
        {...staggerSectionProps(
          4,
          undefined,
          staggerClassName,
          staggerStyle,
        )}
      >
        <DataFreshnessNote
          lastUpdated={getTaxVisaLastUpdated()}
          className="wtr-tax-visa-tab__freshness"
        />
      </div>
    </div>
  );
}
