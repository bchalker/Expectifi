import type { ReactNode } from "react";
import type { AccountIncomeMonthlyContext } from "../lib/accountIncomeMonthly";
import type { CalculatorInputs, ComputedSnapshot } from "../lib/computeResults";
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
  inputs: CalculatorInputs;
  showTaxSummary: boolean;
  incomeMode?: boolean;
  showScenarioGuideTab?: boolean;
  filingStatus: FilingStatusId;
  onFilingStatusChange: (status: FilingStatusId) => void;
  accountIncomeContext?: AccountIncomeMonthlyContext;
  onOpenSocialSecurity?: () => void;
  children: ReactNode;
  className?: string;
};

function TaxSummarySlidePanelHost({
  c,
  inputs,
  filingStatus,
  onFilingStatusChange,
  incomeMode = false,
  showScenarioGuideTab = false,
  accountIncomeContext,
  onOpenSocialSecurity,
}: Pick<
  Props,
  | "c"
  | "inputs"
  | "filingStatus"
  | "onFilingStatusChange"
  | "incomeMode"
  | "showScenarioGuideTab"
  | "accountIncomeContext"
  | "onOpenSocialSecurity"
>) {
  const taxPanel = useTaxSummaryPanelOptional();
  if (!taxPanel?.showTaxSummary) return null;

  return (
    <TaxSummarySlidePanel
      c={c}
      inputs={inputs}
      open={taxPanel.panelOpen}
      onClose={taxPanel.closePanel}
      filingStatus={filingStatus}
      onFilingStatusChange={onFilingStatusChange}
      incomeMode={incomeMode}
      showScenarioGuideTab={showScenarioGuideTab}
      accountIncomeContext={accountIncomeContext}
      onOpenSocialSecurity={onOpenSocialSecurity}
    />
  );
}

export function TaxSummaryCard({
  c,
  inputs,
  showTaxSummary,
  incomeMode = false,
  showScenarioGuideTab = false,
  filingStatus,
  onFilingStatusChange,
  accountIncomeContext,
  onOpenSocialSecurity,
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
          inputs={inputs}
          filingStatus={filingStatus}
          onFilingStatusChange={onFilingStatusChange}
          incomeMode={incomeMode}
          showScenarioGuideTab={showScenarioGuideTab}
          accountIncomeContext={accountIncomeContext}
          onOpenSocialSecurity={onOpenSocialSecurity}
        />

        <div className="tax-summary-card__accordion">
          <AccordionSection title="Tax Summary">
            <TaxSummaryPanelBody
              c={c}
              inputs={inputs}
              incomeMode={incomeMode}
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
