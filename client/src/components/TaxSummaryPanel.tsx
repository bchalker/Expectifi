import type { ComputedSnapshot } from "../lib/computeResults";
import { IconX } from "@tabler/icons-react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import {
  accountLabelForWithdrawalBucket,
  formatMarginalRatesSummary,
  localeSupportsWithdrawalBucket,
  taxFreeWithdrawalLabels,
} from "../config/taxConfig";
import { useUserLocale } from "../context/UserLocaleContext";
import { filingStatusDisplayLabel, type FilingStatusId } from "../lib/filingStatus";
import { pensionConfigForLocale } from "../lib/localePensionConfig";
import { standardDeductionForFilingStatus } from "shared";
import { fmt } from "../utils/format";
import { FilingStatusField } from "./FilingStatusField";
import "./TaxSummaryPanel.scss";

export type TaxSummaryContentProps = {
  c: ComputedSnapshot;
};

export type TaxSummaryPanelBodyProps = TaxSummaryContentProps & {
  filingStatus: FilingStatusId;
  onFilingStatusChange: (status: FilingStatusId) => void;
};

export function TaxSummaryPanelBody({
  c,
  filingStatus,
  onFilingStatusChange,
}: TaxSummaryPanelBodyProps) {
  return (
    <>
      <FilingStatusField
        id="tax-summary-filing-status"
        variant="compact"
        value={filingStatus}
        onChange={onFilingStatusChange}
        className="tax-summary-panel__filing"
      />
      <TaxSummaryContent c={c} />
    </>
  );
}

export function TaxSummaryContent({ c }: TaxSummaryContentProps) {
  const td = c.taxDetail;
  const { locale, taxConfig } = useUserLocale();
  const pension = pensionConfigForLocale(locale);
  const filingLabel = filingStatusDisplayLabel(c.filingStatus);
  const pretaxLabel =
    accountLabelForWithdrawalBucket(taxConfig, "pretax") ?? "Pre-tax retirement";
  const taxFree = taxFreeWithdrawalLabels(taxConfig);
  const stdDed = standardDeductionForFilingStatus(c.filingStatus);
  const stdDedLabel = taxConfig.standardDeductionLabel ?? "Standard deduction";
  const showRoth = localeSupportsWithdrawalBucket(locale, "roth") && td.rothWd > 0;
  const showHsa = localeSupportsWithdrawalBucket(locale, "hsa") && td.hsaWd > 0;
  const taxFreeAnnual =
    (showRoth ? td.rothWd : 0) + (showHsa ? td.hsaWd : 0);

  const ltcgLabel =
    td.ltcgTax > 0
      ? taxConfig.capitalGainsNote
      : `No capital gains tax modeled (${taxConfig.capitalGainsNote})`;

  return (
    <div className="tax-summary-content">
      <p className="tax-summary-content__p">
        Your{" "}
        <strong className="tax-summary-content__em">ordinary income tax</strong> (
        {filingLabel}) is modeled at{" "}
        <strong className="tax-summary-content__em tax-summary-content__em--warn">
          {fmt(td.ordTax)}/year
        </strong>{" "}
        (
        <strong className="tax-summary-content__em tax-summary-content__em--warn">
          {fmt(td.ordTax / 12)}/month
        </strong>
        ), based on a {pretaxLabel.toLowerCase()} withdrawal of{" "}
        <strong className="tax-summary-content__em">{fmt(td.tradWd)}/year</strong>{" "}
        and{" "}
        <strong className="tax-summary-content__em">
          {fmt(td.ssTaxable)}/year
        </strong>{" "}
        in {taxConfig.pensionLabel} treated as taxable ({taxConfig.pensionTaxNote.toLowerCase()}).
        {stdDed != null ? (
          <>
            {" "}
            After the <strong className="tax-summary-content__em">{stdDedLabel}</strong> of{" "}
            <strong className="tax-summary-content__em">{fmt(stdDed)}</strong>, taxable ordinary
            income is about{" "}
            <strong className="tax-summary-content__em tax-summary-content__em--warn">
              {fmt(td.ordinaryIncome)}/year
            </strong>
            .
          </>
        ) : (
          <>
            {" "}
            Taxable ordinary income is about{" "}
            <strong className="tax-summary-content__em tax-summary-content__em--warn">
              {fmt(td.ordinaryIncome)}/year
            </strong>
            .
          </>
        )}
      </p>
      <p className="tax-summary-content__p">
        <strong className="tax-summary-content__em">Investment gains tax</strong> is{" "}
        <strong className="tax-summary-content__em tax-summary-content__em--gold">
          {fmt(td.ltcgTax)}/year
        </strong>{" "}
        (
        <strong className="tax-summary-content__em tax-summary-content__em--gold">
          {fmt(td.ltcgTax / 12)}/month
        </strong>
        ).{" "}
        {accountLabelForWithdrawalBucket(taxConfig, "brokerage") ?? "Brokerage"} withdrawals are{" "}
        <strong className="tax-summary-content__em">{fmt(td.brkWd)}/year</strong>; the model treats
        about <strong className="tax-summary-content__em">60%</strong> as taxable gain (
        <strong className="tax-summary-content__em">{fmt(td.brkGain)}/year</strong>).{" "}
        <strong className="tax-summary-content__em">{ltcgLabel}</strong>
      </p>
      {taxFreeAnnual > 0 ? (
        <p className="tax-summary-content__p">
          <strong className="tax-summary-content__em">Tax-free withdrawals</strong> (
          {taxConfig.taxFreeNote}) total{" "}
          <strong className="tax-summary-content__em tax-summary-content__em--accent">
            {fmt(taxFreeAnnual)}/year
          </strong>
          {showRoth ? (
            <>
              {" "}
              (<strong className="tax-summary-content__em">{fmt(td.rothWd)}/year</strong>{" "}
              {taxFree.primary})
            </>
          ) : null}
          {showHsa ? (
            <>
              , <strong className="tax-summary-content__em">{fmt(td.hsaWd)}/year</strong>{" "}
              {taxFree.secondary ?? "HSA"}
            </>
          ) : null}
          . {taxConfig.pensionLabel} excluded from taxation in this estimate:{" "}
          <strong className="tax-summary-content__em">{fmt(td.ssExclusion)}/year</strong>.
        </p>
      ) : null}
      <p className="tax-summary-content__p">
        Effective rate{" "}
        <strong className="tax-summary-content__em">
          {(td.effectiveRate * 100).toFixed(1)}%
        </strong>
        ; total tax{" "}
        <strong className="tax-summary-content__em">{fmt(c.annTax)}/year</strong> on gross income.
        Marginal rates (indicative):{" "}
        <strong className="tax-summary-content__em">
          {formatMarginalRatesSummary(taxConfig)}
        </strong>
        . {pension.stepTitle} figures use your configured benefits.
      </p>
    </div>
  );
}

export function TaxSummaryPanelFooter({ className = "" }: { className?: string }) {
  const { taxConfig } = useUserLocale();

  return (
    <footer
      className={["tax-summary-panel-footer", className].filter(Boolean).join(" ")}
    >
      {taxConfig.taxDisclaimer}
    </footer>
  );
}

export function TaxSummarySlidePanel({
  className = "",
  c,
  open,
  onClose,
  filingStatus,
  onFilingStatusChange,
}: TaxSummaryContentProps & {
  className?: string;
  open: boolean;
  onClose: () => void;
  filingStatus: FilingStatusId;
  onFilingStatusChange: (status: FilingStatusId) => void;
}) {
  return (
    <aside
      id="tax-summary-panel"
      className={[
        "tax-summary-slide-panel",
        open && "tax-summary-slide-panel--open",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="tax-summary-panel-title"
      aria-hidden={!open}
    >
      <header className="tax-summary-slide-panel__head">
        <div className="tax-summary-slide-panel__head-row">
          <h2 id="tax-summary-panel-title" className="tax-summary-slide-panel__title">
            Tax Breakdown
          </h2>
          <button
            type="button"
            className="tax-summary-slide-panel__close"
            onClick={onClose}
            aria-label="Close tax breakdown"
          >
            <IconX size={18} stroke={1.5} aria-hidden />
          </button>
        </div>
        <FilingStatusField
          id="tax-summary-filing-status"
          variant="compact"
          value={filingStatus}
          onChange={onFilingStatusChange}
          className="tax-summary-slide-panel__filing"
        />
      </header>
      <SimpleBar className="tax-summary-slide-panel__scroll" autoHide={false}>
        <div className="tax-summary-slide-panel__scroll-inner">
          <TaxSummaryContent c={c} />
        </div>
      </SimpleBar>
      <TaxSummaryPanelFooter />
    </aside>
  );
}
