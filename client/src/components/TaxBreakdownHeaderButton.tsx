import { IconCashMove } from "@tabler/icons-react";
import { useTaxSummaryPanelOptional } from "../context/TaxSummaryPanelContext";
import "./TaxSummaryLayout.scss";

/** Opens the tax breakdown slide panel — icon on desktop, labeled button on mobile. */
export function TaxBreakdownHeaderButton({
  mobileLabel = "Taxes: The Forecast",
}: {
  mobileLabel?: string;
}) {
  const taxPanel = useTaxSummaryPanelOptional();

  if (!taxPanel?.showTaxSummary) return null;

  const { panelOpen, togglePanel } = taxPanel;
  const btnClass = [
    "tax-breakdown-header-btn",
    panelOpen && "tax-breakdown-header-btn--active",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="tax-breakdown-header-btn-wrap">
      <span className="tax-breakdown-header-btn-wrap__divider" aria-hidden />
      <button
        type="button"
        className={`${btnClass} tax-breakdown-header-btn--icon`}
        aria-expanded={panelOpen}
        aria-controls="tax-summary-panel"
        aria-label="Tax breakdown"
        onClick={togglePanel}
      >
        <IconCashMove size={18} stroke={1.25} aria-hidden />
      </button>
      <button
        type="button"
        className={`${btnClass} tax-breakdown-header-btn--text`}
        aria-expanded={panelOpen}
        aria-controls="tax-summary-panel"
        onClick={togglePanel}
      >
        {mobileLabel}
      </button>
    </div>
  );
}
