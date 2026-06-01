import { Tabs } from "@heroui/react";
import { useEffect, useState } from "react";
import type { ComputedSnapshot } from "../lib/computeResults";
import {
  accountLabelForWithdrawalBucket,
  formatMarginalRatesSummary,
  localeSupportsWithdrawalBucket,
  taxFreeWithdrawalLabels,
} from "../config/taxConfig";
import { useUserLocale } from "../context/UserLocaleContext";
import { filingStatusDisplayLabel } from "../lib/filingStatus";
import { pensionConfigForLocale } from "../lib/localePensionConfig";
import { standardDeductionForFilingStatus, type FilingStatusId } from "shared";
import { fmt, fmtK, fmtMon } from "../utils/format";
import { SidePanelShell } from "./SidePanelShell";
import "./PanelChrome.scss";
import "./SnapshotPanel.scss";

type C = ComputedSnapshot;

function StripSnapshotNarrative({
  c,
  incomeMode,
  incYield,
  incGrowth,
  wdRate,
  brkBal,
  portColLabel,
  ssIncluded,
  targetRetirementAge,
  includeIncomeTaxSummary = true,
}: {
  c: C;
  incomeMode: boolean;
  incYield: number;
  incGrowth: number;
  wdRate: number;
  brkBal: number;
  portColLabel: string;
  ssIncluded: boolean;
  targetRetirementAge: number;
  includeIncomeTaxSummary?: boolean;
}) {
  const { locale, taxConfig } = useUserLocale();
  const pension = pensionConfigForLocale(locale);
  const td = c.taxDetail;
  const totalBal = c.retBal + brkBal;
  const navDriftPhrase = `${incGrowth >= 0 ? "+" : ""}${(incGrowth * 100).toFixed(1)}% net NAV drift per year`;

  return (
    <div className="strip-narrative">
      <p className="strip-narrative__kicker">Monthly income</p>
      <p className="strip-narrative__p">
        At age{" "}
        <strong className="strip-narrative__em">{targetRetirementAge}+</strong>,{" "}
        {incomeMode ? (
          <>
            With <strong className="strip-narrative__em">{portColLabel}</strong>{" "}
            selected, the model implies about{" "}
            <strong className="strip-narrative__em strip-narrative__em--accent">
              {fmtMon(c.monPort)}
            </strong>{" "}
            from the portfolio each month. That assumes roughly{" "}
            <strong className="strip-narrative__em">{fmt(totalBal)}</strong>{" "}
            across retirement and brokerage at today’s balances, a modeled
            dividend yield of{" "}
            <strong className="strip-narrative__em">
              {(incYield * 100).toFixed(1)}%
            </strong>
            , and{" "}
            <strong className="strip-narrative__em">{navDriftPhrase}</strong>
            {ssIncluded
              ? `, with ${pension.stepTitle} treated as reinvested for this yield path`
              : ""}
            .
          </>
        ) : (
          <>
            With <strong className="strip-narrative__em">{portColLabel}</strong>{" "}
            selected, withdrawals are about{" "}
            <strong className="strip-narrative__em strip-narrative__em--accent">
              {fmtMon(c.monPort)}
            </strong>{" "}
            per month from roughly{" "}
            <strong className="strip-narrative__em">{fmt(totalBal)}</strong>{" "}
            invested, using a{" "}
            <strong className="strip-narrative__em">
              {(wdRate * 100).toFixed(1)}%
            </strong>{" "}
            withdrawal rate on that balance
            {ssIncluded
              ? ` and ${pension.stepTitle} modeled as spent rather than reinvested`
              : ""}
            .
          </>
        )}
      </p>
      {ssIncluded ? (
        <p className="strip-narrative__p">
          {taxConfig.pensionLabel} adds about{" "}
          <strong className="strip-narrative__em strip-narrative__em--accent">
            {fmtMon(c.ss)}
          </strong>{" "}
          for you (age{" "}
          <strong className="strip-narrative__em">{c.ssAge}</strong>
          {locale === "us" ? ", 75% of expected" : ""}) and{" "}
          <strong className="strip-narrative__em strip-narrative__em--accent">
            {fmtMon(c.spouseSS)}
          </strong>{" "}
          for your spouse (age{" "}
          <strong className="strip-narrative__em">{c.spouseAge}</strong>
          {locale === "us" ? ", 50% × 75%" : ""}).
        </p>
      ) : null}
      {includeIncomeTaxSummary ? (
        <p className="strip-narrative__p">
          Estimated tax on ordinary income and investment gains is about{" "}
          <strong className="strip-narrative__em strip-narrative__em--warn">
            {fmt(c.annTax)}/year
          </strong>{" "}
          (
          <strong className="strip-narrative__em strip-narrative__em--warn">
            {fmt(c.annTax / 12)}/month
          </strong>
          ), including{" "}
          <strong className="strip-narrative__em">{fmt(td.ordTax)}</strong>{" "}
          ordinary and{" "}
          <strong className="strip-narrative__em">{fmt(td.ltcgTax)}</strong>{" "}
          {locale === "us" ? "LTCG" : "investment gains"}.
        </p>
      ) : null}
      <p className="strip-narrative__p">
        By age{" "}
        <strong className="strip-narrative__em">{targetRetirementAge}</strong>,
        retirement accounts reach about{" "}
        <strong className="strip-narrative__em strip-narrative__em--accent">
          {fmtK(c.retFV)}
        </strong>{" "}
        (from <strong className="strip-narrative__em">{fmt(c.retBal)}</strong>{" "}
        today). Brokerage grows to about{" "}
        <strong className="strip-narrative__em strip-narrative__em--accent">
          {fmtK(c.brkFV)}
        </strong>{" "}
        (<strong className="strip-narrative__em">{fmt(brkBal)}</strong>{" "}
        starting, in withdrawal)        . Combined portfolio is about{" "}
        <strong className="strip-narrative__em strip-narrative__em--accent">
          {fmtK(c.totalFV)}
        </strong>
        .
      </p>
    </div>
  );
}

function StripTaxNarrative({
  td,
  annTax,
  filingStatus,
}: {
  td: C["taxDetail"];
  annTax: number;
  filingStatus: FilingStatusId;
}) {
  const { locale, taxConfig } = useUserLocale();
  const pension = pensionConfigForLocale(locale);
  const filingLabel = filingStatusDisplayLabel(filingStatus);
  const pretaxLabel =
    accountLabelForWithdrawalBucket(taxConfig, "pretax") ?? "Pre-tax retirement";
  const taxFree = taxFreeWithdrawalLabels(taxConfig);
  const stdDed = standardDeductionForFilingStatus(filingStatus);
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
    <div className="strip-narrative">
      <p className="strip-narrative__kicker">Tax breakdown</p>
      <p className="strip-narrative__p" style={{ marginBottom: "0.5rem" }}>
        Filing: <strong className="strip-narrative__em">{filingLabel}</strong>
        <span className="strip-narrative__filing-note">
          {" "}
          (change in Configure → Planning)
        </span>
      </p>
      <p className="strip-narrative__p">
        Your{" "}
        <strong className="strip-narrative__em">ordinary income tax</strong> (
        {filingLabel}) is modeled at{" "}
        <strong className="strip-narrative__em strip-narrative__em--warn">
          {fmt(td.ordTax)}/year
        </strong>{" "}
        (
        <strong className="strip-narrative__em strip-narrative__em--warn">
          {fmt(td.ordTax / 12)}/month
        </strong>
        ), based on a {pretaxLabel.toLowerCase()} withdrawal of{" "}
        <strong className="strip-narrative__em">{fmt(td.tradWd)}/year</strong>{" "}
        and{" "}
        <strong className="strip-narrative__em">
          {fmt(td.ssTaxable)}/year
        </strong>{" "}
        in {taxConfig.pensionLabel} treated as taxable ({taxConfig.pensionTaxNote.toLowerCase()}).
        {stdDed != null ? (
          <>
            {" "}
            After the <strong className="strip-narrative__em">{stdDedLabel}</strong> of{" "}
            <strong className="strip-narrative__em">{fmt(stdDed)}</strong>, taxable ordinary
            income is about{" "}
            <strong className="strip-narrative__em strip-narrative__em--warn">
              {fmt(td.ordinaryIncome)}/year
            </strong>
            .
          </>
        ) : (
          <>
            {" "}
            Taxable ordinary income is about{" "}
            <strong className="strip-narrative__em strip-narrative__em--warn">
              {fmt(td.ordinaryIncome)}/year
            </strong>
            .
          </>
        )}
      </p>
      <p className="strip-narrative__p">
        <strong className="strip-narrative__em">Investment gains tax</strong> is{" "}
        <strong className="strip-narrative__em strip-narrative__em--gold">
          {fmt(td.ltcgTax)}/year
        </strong>{" "}
        (
        <strong className="strip-narrative__em strip-narrative__em--gold">
          {fmt(td.ltcgTax / 12)}/month
        </strong>
        ).{" "}
        {accountLabelForWithdrawalBucket(taxConfig, "brokerage") ?? "Brokerage"} withdrawals are{" "}
        <strong className="strip-narrative__em">{fmt(td.brkWd)}/year</strong>; the model treats
        about <strong className="strip-narrative__em">60%</strong> as taxable gain (
        <strong className="strip-narrative__em">{fmt(td.brkGain)}/year</strong>).{" "}
        <strong className="strip-narrative__em">{ltcgLabel}</strong>
      </p>
      {taxFreeAnnual > 0 ? (
        <p className="strip-narrative__p">
          <strong className="strip-narrative__em">Tax-free withdrawals</strong> (
          {taxConfig.taxFreeNote}) total{" "}
          <strong className="strip-narrative__em strip-narrative__em--accent">
            {fmt(taxFreeAnnual)}/year
          </strong>
          {showRoth ? (
            <>
              {" "}
              (<strong className="strip-narrative__em">{fmt(td.rothWd)}/year</strong>{" "}
              {taxFree.primary})
            </>
          ) : null}
          {showHsa ? (
            <>
              , <strong className="strip-narrative__em">{fmt(td.hsaWd)}/year</strong>{" "}
              {taxFree.secondary ?? "HSA"}
            </>
          ) : null}
          . {taxConfig.pensionLabel} excluded from taxation in this estimate:{" "}
          <strong className="strip-narrative__em">{fmt(td.ssExclusion)}/year</strong>.
        </p>
      ) : null}
      <p className="strip-narrative__p">
        Effective rate{" "}
        <strong className="strip-narrative__em">
          {(td.effectiveRate * 100).toFixed(1)}%
        </strong>
        ; total tax{" "}
        <strong className="strip-narrative__em">{fmt(annTax)}/year</strong> on gross income.
        Marginal rates (indicative):{" "}
        <strong className="strip-narrative__em">
          {formatMarginalRatesSummary(taxConfig)}
        </strong>
        . {pension.stepTitle} figures use your configured benefits.
      </p>
      <p className="strip-narrative__footnote" style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        {taxConfig.taxDisclaimer}
      </p>
    </div>
  );
}

type SnapshotPanelProps = {
  open: boolean;
  onClose: () => void;
  c: ComputedSnapshot;
  incomeMode: boolean;
  incYield: number;
  incGrowth: number;
  wdRate: number;
  brkBal: number;
  ssIncluded: boolean;
  targetRetirementAge: number;
};

export function SnapshotPanel({
  open,
  onClose,
  c,
  incomeMode,
  incYield,
  incGrowth,
  wdRate,
  brkBal,
  ssIncluded,
  targetRetirementAge,
}: SnapshotPanelProps) {
  const td = c.taxDetail;
  const [snapshotTab, setSnapshotTab] = useState<"overview" | "tax">("overview");

  useEffect(() => {
    if (!open) setSnapshotTab("overview");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const portColLabel = incomeMode
    ? "Portfolio yield (pension not reinvested)"
    : "Portfolio withdrawal (pension not reinvested)";

  return (
    <>
      <div
        className={`panel-backdrop${open ? " panel-backdrop--open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <SidePanelShell
        open={open}
        id="strip-snapshot-panel"
        titleId="strip-snapshot-panel-title"
        title="Income snapshot"
        aria-labelledby="app-top-chrome-snapshot-btn app-left-nav-snapshot-btn strip-snapshot-panel-title"
        onClose={onClose}
        closeAriaLabel="Close snapshot panel"
        scrollKey="snapshot"
        shellClassName="drawer-shell--right drawer-shell--snapshot"
        bodyClassName="snapshot-panel-body"
      >
        <Tabs
          className="strip-snapshot-tabs"
          selectedKey={snapshotTab}
          onSelectionChange={(key) => setSnapshotTab(key === "tax" ? "tax" : "overview")}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Snapshot">
              <Tabs.Tab id="overview">
                <span className="strip-snapshot-tab__label">Overview</span>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="tax">
                <Tabs.Separator />
                <span className="strip-snapshot-tab__label">Tax Breakdown</span>
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="overview" className="strip-snapshot-tabpanel">
            <StripSnapshotNarrative
              c={c}
              incomeMode={incomeMode}
              incYield={incYield}
              incGrowth={incGrowth}
              wdRate={wdRate}
              brkBal={brkBal}
              portColLabel={portColLabel}
              ssIncluded={ssIncluded}
              targetRetirementAge={targetRetirementAge}
              includeIncomeTaxSummary={false}
            />
          </Tabs.Panel>
          <Tabs.Panel id="tax" className="strip-snapshot-tabpanel">
            <StripTaxNarrative td={td} annTax={c.annTax} filingStatus={c.filingStatus} />
          </Tabs.Panel>
        </Tabs>
      </SidePanelShell>
    </>
  );
}
