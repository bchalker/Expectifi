import type { ReactNode } from "react";
import { useTaxSummaryPanelOptional } from "../context/TaxSummaryPanelContext";

type Props = {
  children: ReactNode;
  /** Standalone helper under the section title, or inline (e.g. Why?). */
  variant?: "standalone" | "inline";
  className?: string;
};

/** Amber text control that opens the Forecast / Harvest slide panel. */
export function TaxBreakdownPanelTrigger({
  children,
  variant = "standalone",
  className = "",
}: Props) {
  const taxPanel = useTaxSummaryPanelOptional();

  if (!taxPanel?.showTaxSummary) return null;

  const { panelOpen, openPanel } = taxPanel;

  return (
    <button
      type="button"
      className={[
        "tax-breakdown-panel-trigger",
        variant === "inline" && "tax-breakdown-panel-trigger--inline",
        panelOpen && "tax-breakdown-panel-trigger--active",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-expanded={panelOpen}
      aria-controls="tax-summary-panel"
      onClick={openPanel}
    >
      {children}
    </button>
  );
}
