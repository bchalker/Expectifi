import { useMemo, type CSSProperties } from "react";
import { IconInfoCircle, IconWorld } from "@tabler/icons-react";
import {
  getTaxVisaData,
  getTaxVisaScopeLabel,
  TAX_VISA_FOREIGN_INCOME_NOTE,
  TAX_VISA_TAB_DISCLAIMER_BODY,
  TAX_VISA_UNAVAILABLE_MESSAGE,
} from "../../utils/taxVisa";
import "./DestinationTaxVisaTab.scss";

type Props = {
  country: string;
  staggerClassName?: string;
  staggerStyle?: (index: number) => CSSProperties;
};

function staggerSectionProps(
  index: number,
  baseClass: string | undefined,
  staggerClassName: string | undefined,
  staggerStyle: ((index: number) => CSSProperties) | undefined,
): { className?: string; style?: CSSProperties } {
  if (!staggerClassName || !staggerStyle) {
    return baseClass ? { className: baseClass } : {};
  }
  return {
    className: baseClass
      ? `${baseClass} ${staggerClassName}`
      : staggerClassName,
    style: staggerStyle(index),
  };
}

export function DestinationTaxVisaTab({
  country,
  staggerClassName,
  staggerStyle,
}: Props) {
  const data = useMemo(() => getTaxVisaData(country), [country]);
  const scope = useMemo(() => getTaxVisaScopeLabel(country), [country]);

  if (!data) {
    return (
      <p
        className="wtr-tax-visa__empty"
        {...staggerSectionProps(
          0,
          "wtr-tax-visa__empty",
          staggerClassName,
          staggerStyle,
        )}
      >
        {TAX_VISA_UNAVAILABLE_MESSAGE}
      </p>
    );
  }

  const ScopeIcon = scope.regional ? IconInfoCircle : IconWorld;

  return (
    <div className="wtr-tax-visa">
      <p
        className="wtr-tax-visa__scope"
        {...staggerSectionProps(
          0,
          "wtr-tax-visa__scope",
          staggerClassName,
          staggerStyle,
        )}
      >
        <ScopeIcon
          className="wtr-tax-visa__scope-icon"
          size={14}
          stroke={1.5}
          aria-hidden
        />
        <span>{scope.text}</span>
      </p>
      <section
        className="wtr-tax-visa__group"
        aria-labelledby="wtr-tax-visa-tax-heading"
        {...staggerSectionProps(
          1,
          "wtr-tax-visa__group",
          staggerClassName,
          staggerStyle,
        )}
      >
        <h3
          id="wtr-tax-visa-tax-heading"
          className="wtr-tax-visa__section-title"
        >
          Retirement income tax
        </h3>
        <dl className="wtr-tax-visa__rows">
          <div className="wtr-tax-visa__row">
            <dt className="wtr-tax-visa__label">Tax rate</dt>
            <dd className="wtr-tax-visa__value wtr-tax-visa__value--prominent">
              {data.tax_rate_label}
            </dd>
          </div>
          <div className="wtr-tax-visa__row">
            <dt className="wtr-tax-visa__label">Tax on foreign income</dt>
            <dd className="wtr-tax-visa__value">{data.tax_summary}</dd>
            <p className="wtr-tax-visa__note">{TAX_VISA_FOREIGN_INCOME_NOTE}</p>
          </div>
          <div className="wtr-tax-visa__row">
            <dt className="wtr-tax-visa__label">
              Key exemptions &amp; treaties
            </dt>
            <dd className="wtr-tax-visa__value">{data.key_exemptions}</dd>
            {data.us_tax_treaty ? (
              <span className="wtr-tax-visa__treaty-badge">
                US Tax Treaty ✓
              </span>
            ) : null}
          </div>
        </dl>
      </section>

      <section
        className="wtr-tax-visa__group"
        aria-labelledby="wtr-tax-visa-visa-heading"
        {...staggerSectionProps(
          2,
          "wtr-tax-visa__group",
          staggerClassName,
          staggerStyle,
        )}
      >
        <h3
          id="wtr-tax-visa-visa-heading"
          className="wtr-tax-visa__section-title"
        >
          Residency &amp; visa
        </h3>
        <dl className="wtr-tax-visa__rows">
          <div className="wtr-tax-visa__row">
            <dt className="wtr-tax-visa__label">Visa / residency program</dt>
            <dd className="wtr-tax-visa__value wtr-tax-visa__value--prominent">
              {data.visa_name}
            </dd>
          </div>
          <div className="wtr-tax-visa__row">
            <dt className="wtr-tax-visa__label">Income requirement</dt>
            <dd className="wtr-tax-visa__value">
              {data.visa_income_requirement}
            </dd>
          </div>
          <div className="wtr-tax-visa__row">
            <dt className="wtr-tax-visa__label">How it works</dt>
            <dd className="wtr-tax-visa__value">{data.visa_summary}</dd>
          </div>
        </dl>
      </section>

      <section
        className="wtr-tax-visa__group"
        aria-labelledby="wtr-tax-visa-health-heading"
        {...staggerSectionProps(
          3,
          "wtr-tax-visa__group",
          staggerClassName,
          staggerStyle,
        )}
      >
        <h3
          id="wtr-tax-visa-health-heading"
          className="wtr-tax-visa__section-title"
        >
          Healthcare for US expats
        </h3>
        <dl className="wtr-tax-visa__rows">
          <div className="wtr-tax-visa__row">
            <dt className="wtr-tax-visa__label">Healthcare access</dt>
            <dd className="wtr-tax-visa__value">{data.healthcare_notes}</dd>
          </div>
        </dl>
      </section>

      <p
        className="wtr-tax-visa__disclaimer"
        {...staggerSectionProps(
          4,
          "wtr-tax-visa__disclaimer",
          staggerClassName,
          staggerStyle,
        )}
      >
        <strong>Sources</strong>: {TAX_VISA_TAB_DISCLAIMER_BODY}
      </p>
    </div>
  );
}
