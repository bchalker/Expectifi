import type { ReactNode } from "react";
import type { ComputedSnapshot } from "../lib/computeResults";
import type { FilingStatusId } from "../lib/filingStatus";
import { TaxSummaryPanelProvider, useTaxSummaryPanelOptional } from "../context/TaxSummaryPanelContext";
import { AccordionSection } from "./ui/AccordionSection";
import {
  TaxSummaryPanelBody,
  TaxSummaryPanelFooter,
  TaxSummarySlidePanel,
} from "./TaxSummaryPanel";
import "./TaxSummaryLayout.scss";

type Props = {
  c: ComputedSnapshot;
  showTaxSummary: boolean;
  incomeMode?: boolean;
  filingStatus: FilingStatusId;
  onFilingStatusChange: (status: FilingStatusId) => void;
  children: ReactNode;
  className?: string;
};

function TaxSummarySlidePanelHost({
  c,
  filingStatus,
  onFilingStatusChange,
  incomeMode = false,
}: Pick<Props, "c" | "filingStatus" | "onFilingStatusChange" | "incomeMode">) {
  const taxPanel = useTaxSummaryPanelOptional();
  if (!taxPanel?.showTaxSummary) return null;

  return (
    <TaxSummarySlidePanel
      c={c}
      open={taxPanel.panelOpen}
      onClose={taxPanel.closePanel}
      filingStatus={filingStatus}
      onFilingStatusChange={onFilingStatusChange}
      incomeMode={incomeMode}
    />
  );
}

export function TaxSummaryCard({
  c,
  showTaxSummary,
  incomeMode = false,
  filingStatus,
  onFilingStatusChange,
  children,
  className = "",
}: Props) {
  if (!showTaxSummary) {
    return <>{children}</>
  }

  return (
    <TaxSummaryPanelProvider showTaxSummary={showTaxSummary}>
      <div
        className={["tax-summary-card", "tax-summary-card--has-panel", className]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="tax-summary-card__accounts">{children}</div>
        <TaxSummarySlidePanelHost
          c={c}
          filingStatus={filingStatus}
          onFilingStatusChange={onFilingStatusChange}
          incomeMode={incomeMode}
        />

        <div className="tax-summary-card__accordion">
          <AccordionSection title="Tax Summary">
            <TaxSummaryPanelBody
              c={c}
              filingStatus={filingStatus}
              onFilingStatusChange={onFilingStatusChange}
            />
            <TaxSummaryPanelFooter className="tax-summary-panel-footer--accordion" />
          </AccordionSection>
        </div>
      </div>
    </TaxSummaryPanelProvider>
  );
}
