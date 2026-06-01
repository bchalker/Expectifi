import { IconCashMove } from "@tabler/icons-react";
import { useTaxSummaryPanelOptional } from "../context/TaxSummaryPanelContext";
import "./TaxSummaryLayout.scss";

/** Opens the desktop tax breakdown slide panel — render in account header actions. */
export function TaxBreakdownHeaderButton() {
  const taxPanel = useTaxSummaryPanelOptional();

  if (!taxPanel?.showTaxSummary) return null;

  const { panelOpen, togglePanel } = taxPanel;

  return (
    <div className="tax-breakdown-header-btn-wrap">
      <span className="tax-breakdown-header-btn-wrap__divider" aria-hidden />
      <button
        type="button"
        className={[
          "tax-breakdown-header-btn",
          panelOpen && "tax-breakdown-header-btn--active",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-expanded={panelOpen}
        aria-controls="tax-summary-panel"
        aria-label="Tax breakdown"
        onClick={togglePanel}
      >
        <IconCashMove size={18} stroke={1.25} aria-hidden />
      </button>
    </div>
  );
}
