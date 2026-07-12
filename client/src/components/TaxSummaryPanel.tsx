import type { AccountIncomeMonthlyContext } from "../lib/accountIncomeMonthly";
import type { CalculatorInputs, ComputedSnapshot } from "../lib/computeResults";
import { IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { AppOverlayScrollbars } from "./ui/AppOverlayScrollbars";
import { BottomSheetHandle } from "./ui/BottomSheetHandle";
import { BottomSheetPortal } from "./ui/BottomSheetPortal";
import { useBottomSheetDrag } from "../hooks/useBottomSheetDrag";
import { useBottomSheetSlideShadow } from "../hooks/useBottomSheetSlideShadow";
import { useIsMobileBottomSheet } from "../hooks/useMobileBottomSheet";
import { useBottomSheetStackRegistration } from "../context/BottomSheetStackContext";
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
import { AccountIncomeStrategiesPanel } from "./AccountIncomeStrategiesPanel";
import { HoldingScenarioGuidePanel } from "./HoldingScenarioGuidePanel";
import { PortfolioGuidancePanel } from "./PortfolioGuidancePanel";
import { TaxBreakdownForecastContent } from "./TaxBreakdownForecastContent";
import { TaxBreakdownHarvestContent } from "./TaxBreakdownHarvestContent";
import "./TaxSummaryPanel.scss";

export type TaxSummaryContentProps = {
  c: ComputedSnapshot;
};

export type TaxSummaryPanelBodyProps = TaxSummaryContentProps & {
  filingStatus: FilingStatusId;
  onFilingStatusChange: (status: FilingStatusId) => void;
  incomeMode?: boolean;
  inputs: CalculatorInputs;
};

export function TaxSummaryPanelBody({
  c,
  filingStatus,
  onFilingStatusChange,
  incomeMode = false,
  inputs,
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
      {!incomeMode ? (
        <TaxBreakdownForecastContent c={c} inputs={inputs} incomeModeFlag={incomeMode} />
      ) : (
        <TaxSummaryContent c={c} />
      )}
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

export const INSIGHTS_PANEL_TITLE_GROWTH = "The Forecast";
export const INSIGHTS_PANEL_TITLE_INCOME = "The Harvest";

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

type ExpectifinsightsTabId =
  | "tax-breakdown"
  | "portfolio-guidance"
  | "scenario-guide"
  | "strategies";

function ExpectifinsightsPanelTabs({
  c,
  inputs,
  filingStatus,
  onFilingStatusChange,
  variant,
  panelTitle,
  accountIncomeContext,
  onOpenSocialSecurity,
}: {
  c: ComputedSnapshot;
  inputs: CalculatorInputs;
  filingStatus: FilingStatusId;
  onFilingStatusChange: (status: FilingStatusId) => void;
  variant: "income" | "growth";
  panelTitle: string;
  accountIncomeContext?: AccountIncomeMonthlyContext;
  onOpenSocialSecurity?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ExpectifinsightsTabId>("tax-breakdown");

  return (
    <div className="tax-summary-slide-panel__tabs">
      <div
        className="tax-summary-slide-panel__tablist"
        role="tablist"
        aria-label={`${panelTitle} sections`}
      >
        <button
          type="button"
          id="expectifinsights-tab-tax-breakdown"
          role="tab"
          className={[
            "tax-summary-slide-panel__tab",
            activeTab === "tax-breakdown" && "tax-summary-slide-panel__tab--active",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-selected={activeTab === "tax-breakdown"}
          aria-controls="expectifinsights-panel-tax-breakdown"
          onClick={() => setActiveTab("tax-breakdown")}
        >
          Tax Breakdown
        </button>
        {variant === "income" ? (
          <>
            <button
              type="button"
              id="expectifinsights-tab-strategies"
              role="tab"
              className={[
                "tax-summary-slide-panel__tab",
                activeTab === "strategies" &&
                  "tax-summary-slide-panel__tab--active",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-selected={activeTab === "strategies"}
              aria-controls="expectifinsights-panel-strategies"
              onClick={() => setActiveTab("strategies")}
            >
              Strategies
            </button>
            <button
              type="button"
              id="expectifinsights-tab-portfolio-guidance"
              role="tab"
              className={[
                "tax-summary-slide-panel__tab",
                activeTab === "portfolio-guidance" &&
                  "tax-summary-slide-panel__tab--active",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-selected={activeTab === "portfolio-guidance"}
              aria-controls="expectifinsights-panel-portfolio-guidance"
              onClick={() => setActiveTab("portfolio-guidance")}
            >
              Portfolio Guidance
            </button>
          </>
        ) : (
          <button
            type="button"
            id="expectifinsights-tab-scenario-guide"
            role="tab"
            className={[
              "tax-summary-slide-panel__tab",
              activeTab === "scenario-guide" &&
                "tax-summary-slide-panel__tab--active",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-selected={activeTab === "scenario-guide"}
            aria-controls="expectifinsights-panel-scenario-guide"
            onClick={() => setActiveTab("scenario-guide")}
          >
            Scenario Guide
          </button>
        )}
      </div>
      <div
        id="expectifinsights-panel-tax-breakdown"
        role="tabpanel"
        aria-labelledby="expectifinsights-tab-tax-breakdown"
        hidden={activeTab !== "tax-breakdown"}
        className="tax-summary-slide-panel__tab-panel"
      >
        <AppOverlayScrollbars
          className="tax-summary-slide-panel__scroll tax-summary-slide-panel__scroll--tabbed"
          defer={false}
        >
          <div className="tax-summary-slide-panel__scroll-inner">
            <FilingStatusField
              id="tax-summary-slide-filing-status"
              variant="compact"
              value={filingStatus}
              onChange={onFilingStatusChange}
              className="tax-summary-slide-panel__filing"
            />
            {variant === "income" && accountIncomeContext ? (
              <TaxBreakdownHarvestContent
                c={c}
                accountIncomeContext={accountIncomeContext}
                onOpenSocialSecurity={onOpenSocialSecurity}
              />
            ) : (
              <TaxBreakdownForecastContent
                c={c}
                inputs={inputs}
                incomeModeFlag={false}
              />
            )}
          </div>
        </AppOverlayScrollbars>
      </div>
      {variant === "income" ? (
        <>
          <div
            id="expectifinsights-panel-strategies"
            role="tabpanel"
            aria-labelledby="expectifinsights-tab-strategies"
            hidden={activeTab !== "strategies"}
            className="tax-summary-slide-panel__tab-panel"
          >
            <AppOverlayScrollbars
              className="tax-summary-slide-panel__scroll tax-summary-slide-panel__scroll--tabbed"
              defer={false}
            >
              <div className="tax-summary-slide-panel__scroll-inner">
                <AccountIncomeStrategiesPanel />
              </div>
            </AppOverlayScrollbars>
          </div>
          <div
            id="expectifinsights-panel-portfolio-guidance"
            role="tabpanel"
            aria-labelledby="expectifinsights-tab-portfolio-guidance"
            hidden={activeTab !== "portfolio-guidance"}
            className="tax-summary-slide-panel__tab-panel"
          >
            <AppOverlayScrollbars
              className="tax-summary-slide-panel__scroll tax-summary-slide-panel__scroll--tabbed"
              defer={false}
            >
              <div className="tax-summary-slide-panel__scroll-inner">
                <PortfolioGuidancePanel c={c} />
              </div>
            </AppOverlayScrollbars>
          </div>
        </>
      ) : (
        <div
          id="expectifinsights-panel-scenario-guide"
          role="tabpanel"
          aria-labelledby="expectifinsights-tab-scenario-guide"
          hidden={activeTab !== "scenario-guide"}
          className="tax-summary-slide-panel__tab-panel"
        >
          <AppOverlayScrollbars
            className="tax-summary-slide-panel__scroll tax-summary-slide-panel__scroll--tabbed"
            defer={false}
          >
            <div className="tax-summary-slide-panel__scroll-inner">
              <HoldingScenarioGuidePanel />
            </div>
          </AppOverlayScrollbars>
        </div>
      )}
    </div>
  );
}

export function TaxSummarySlidePanel({
  className = "",
  c,
  inputs,
  open,
  onClose,
  filingStatus,
  onFilingStatusChange,
  incomeMode = false,
  showScenarioGuideTab = false,
  accountIncomeContext,
  onOpenSocialSecurity,
}: TaxSummaryContentProps & {
  className?: string;
  inputs: CalculatorInputs;
  open: boolean;
  onClose: () => void;
  filingStatus: FilingStatusId;
  onFilingStatusChange: (status: FilingStatusId) => void;
  incomeMode?: boolean;
  /** Growth mode: Tax Breakdown + Scenario Guide tabs. */
  showScenarioGuideTab?: boolean;
  accountIncomeContext?: AccountIncomeMonthlyContext;
  onOpenSocialSecurity?: () => void;
}) {
  const panelTitle = incomeMode
    ? INSIGHTS_PANEL_TITLE_INCOME
    : INSIGHTS_PANEL_TITLE_GROWTH;
  const isMobileSheet = useIsMobileBottomSheet();
  const panelRef = useRef<HTMLElement>(null);
  const {
    isDragging,
    panelStyle,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useBottomSheetDrag({
    enabled: isMobileSheet,
    open,
    panelRef,
    onDismiss: onClose,
  });

  useBottomSheetStackRegistration(open);

  const isSliding = useBottomSheetSlideShadow(panelRef, open, true, {
    durationMs: isMobileSheet ? 300 : 250,
  });

  return (
    <BottomSheetPortal enabled>
      {open ? (
        <div
          className="tax-summary-slide-panel-backdrop tax-summary-slide-panel-backdrop--open"
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <aside
        ref={panelRef}
        id="tax-summary-panel"
        role="dialog"
        aria-modal="true"
        style={isMobileSheet ? panelStyle : undefined}
        className={[
          "tax-summary-slide-panel",
          open && "tax-summary-slide-panel--open",
          isSliding && "tax-summary-slide-panel--sliding",
          isMobileSheet && "tax-summary-slide-panel--mobile-sheet",
          isDragging && "mobile-bottom-sheet-panel--dragging",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-labelledby="tax-summary-panel-title"
        aria-hidden={!open}
      >
        {isMobileSheet ? (
          <BottomSheetHandle
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        ) : null}
      <header className="tax-summary-slide-panel__head">
        <div className="tax-summary-slide-panel__head-row">
          <h2 id="tax-summary-panel-title" className="tax-summary-slide-panel__title">
            {panelTitle}
          </h2>
          <button
            type="button"
            className="tax-summary-slide-panel__close"
            onClick={onClose}
            aria-label={`Close ${panelTitle}`}
          >
            <IconX size={18} stroke={1.5} aria-hidden />
          </button>
        </div>
      </header>
      {incomeMode || showScenarioGuideTab ? (
        <ExpectifinsightsPanelTabs
          c={c}
          inputs={inputs}
          filingStatus={filingStatus}
          onFilingStatusChange={onFilingStatusChange}
          variant={incomeMode ? "income" : "growth"}
          panelTitle={panelTitle}
          accountIncomeContext={accountIncomeContext}
          onOpenSocialSecurity={onOpenSocialSecurity}
        />
      ) : (
        <AppOverlayScrollbars className="tax-summary-slide-panel__scroll" defer={false}>
          <div className="tax-summary-slide-panel__scroll-inner">
            <FilingStatusField
              id="tax-summary-slide-filing-status"
              variant="compact"
              value={filingStatus}
              onChange={onFilingStatusChange}
              className="tax-summary-slide-panel__filing"
            />
            {!incomeMode ? (
              <TaxBreakdownForecastContent
                c={c}
                inputs={inputs}
                incomeModeFlag={incomeMode}
              />
            ) : (
              <TaxSummaryContent c={c} />
            )}
          </div>
        </AppOverlayScrollbars>
      )}
      <TaxSummaryPanelFooter />
    </aside>
    </BottomSheetPortal>
  );
}
