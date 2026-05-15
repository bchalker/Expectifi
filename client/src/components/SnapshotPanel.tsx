import { useEffect, useState } from "react";
import type { ComputedSnapshot } from "../lib/computeResults";
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
              ? ", with Social Security treated as reinvested for this yield path"
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
              ? " and Social Security modeled as spent rather than reinvested"
              : ""}
            .
          </>
        )}
      </p>
      {ssIncluded ? (
        <p className="strip-narrative__p">
          Social Security adds about{" "}
          <strong className="strip-narrative__em strip-narrative__em--accent">
            {fmtMon(c.ss)}
          </strong>{" "}
          for you (age{" "}
          <strong className="strip-narrative__em">{c.ssAge}</strong>, 75% of
          expected) and{" "}
          <strong className="strip-narrative__em strip-narrative__em--accent">
            {fmtMon(c.spouseSS)}
          </strong>{" "}
          for your spouse (age{" "}
          <strong className="strip-narrative__em">{c.spouseAge}</strong>, 50% ×
          75%).
        </p>
      ) : null}
      {includeIncomeTaxSummary ? (
        <p className="strip-narrative__p">
          Federal tax on ordinary income plus long-term capital gains is modeled
          at about{" "}
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
          LTCG.
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
        starting, in withdrawal). Combined portfolio is about{" "}
        <strong className="strip-narrative__em strip-narrative__em--accent">
          {fmtK(c.totalFV)}
        </strong>
        . Home equity is shown as{" "}
        <strong className="strip-narrative__em strip-narrative__em--gold">
          ~$250k
        </strong>
        ; if that were invested at your assumptions it could add roughly{" "}
        <strong className="strip-narrative__em strip-narrative__em--gold">
          {fmtMon(c.equityMon)}/month
        </strong>
        .
      </p>
    </div>
  );
}

function StripTaxNarrative({
  td,
  annTax,
}: {
  td: C["taxDetail"];
  annTax: number;
}) {
  const ltcgLabel = td.ltcgTax > 0 ? "15%" : "0% (under threshold)";
  const taxFreeAnnual = td.rothWd + td.hsaWd;

  return (
    <div className="strip-narrative">
      <p className="strip-narrative__kicker">Tax breakdown</p>
      <p className="strip-narrative__p">
        Your{" "}
        <strong className="strip-narrative__em">
          ordinary income tax (MFJ)
        </strong>{" "}
        is modeled at{" "}
        <strong className="strip-narrative__em strip-narrative__em--warn">
          {fmt(td.ordTax)}/year
        </strong>{" "}
        (
        <strong className="strip-narrative__em strip-narrative__em--warn">
          {fmt(td.ordTax / 12)}/month
        </strong>
        ), based on a traditional 401k withdrawal of{" "}
        <strong className="strip-narrative__em">{fmt(td.tradWd)}/year</strong>{" "}
        and{" "}
        <strong className="strip-narrative__em">
          {fmt(td.ssTaxable)}/year
        </strong>{" "}
        in Social Security treated as taxable (up to 85%). After the{" "}
        <strong className="strip-narrative__em">MFJ standard deduction</strong>{" "}
        of <strong className="strip-narrative__em">$29,200</strong>, taxable
        ordinary income is about{" "}
        <strong className="strip-narrative__em strip-narrative__em--warn">
          {fmt(td.ordinaryIncome)}/year
        </strong>
        .
      </p>
      <p className="strip-narrative__p">
        <strong className="strip-narrative__em">Long-term capital gains</strong>{" "}
        tax is{" "}
        <strong className="strip-narrative__em strip-narrative__em--gold">
          {fmt(td.ltcgTax)}/year
        </strong>{" "}
        (
        <strong className="strip-narrative__em strip-narrative__em--gold">
          {fmt(td.ltcgTax / 12)}/month
        </strong>
        ). Brokerage withdrawals are{" "}
        <strong className="strip-narrative__em">{fmt(td.brkWd)}/year</strong>;
        the model treats about{" "}
        <strong className="strip-narrative__em">60%</strong> as taxable gain (
        <strong className="strip-narrative__em">{fmt(td.brkGain)}/year</strong>
        ), with rate{" "}
        <strong className="strip-narrative__em strip-narrative__em--gold">
          {ltcgLabel}
        </strong>
        .
      </p>
      <p className="strip-narrative__p">
        <strong className="strip-narrative__em">Tax-free income</strong> from
        Roth and HSA withdrawals totals{" "}
        <strong className="strip-narrative__em strip-narrative__em--accent">
          {fmt(taxFreeAnnual)}/year
        </strong>{" "}
        (<strong className="strip-narrative__em">{fmt(td.rothWd)}/year</strong>{" "}
        Roth,{" "}
        <strong className="strip-narrative__em">{fmt(td.hsaWd)}/year</strong>{" "}
        HSA). Social Security excluded from taxation is{" "}
        <strong className="strip-narrative__em">
          {fmt(td.ssExclusion)}/year
        </strong>
        . Your effective rate is{" "}
        <strong className="strip-narrative__em">
          {(td.effectiveRate * 100).toFixed(1)}%
        </strong>
        , with total tax of{" "}
        <strong className="strip-narrative__em">{fmt(annTax)}/year</strong> on
        gross income under <strong className="strip-narrative__em">MFJ</strong>{" "}
        filing status.
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
  const [snapshotTab, setSnapshotTab] = useState<"overview" | "tax">(
    "overview",
  );

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
    ? "Portfolio yield (SS not reinvested)"
    : "Portfolio withdrawal (SS not reinvested)";

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
        scrollKey={open ? "snapshot" : ""}
        shellClassName="drawer-shell--right drawer-shell--snapshot"
        bodyClassName="snapshot-panel-body"
      >
        <div
          className="strip-snapshot-tabs"
          role="tablist"
          aria-label="Snapshot"
        >
            <button
              type="button"
              role="tab"
              id="strip-tab-overview"
              aria-selected={snapshotTab === "overview"}
              aria-controls="strip-tabpanel-overview"
              className={`tab-btn${snapshotTab === "overview" ? " active" : ""}`}
              onClick={() => setSnapshotTab("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              role="tab"
              id="strip-tab-tax"
              aria-selected={snapshotTab === "tax"}
              aria-controls="strip-tabpanel-tax"
              className={`tab-btn${snapshotTab === "tax" ? " active" : ""}`}
              onClick={() => setSnapshotTab("tax")}
            >
              Tax Breakdown
            </button>
          </div>
          <div
            id="strip-tabpanel-overview"
            role="tabpanel"
            aria-labelledby="strip-tab-overview"
            hidden={snapshotTab !== "overview"}
            className="strip-snapshot-tabpanel"
          >
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
          </div>
          <div
            id="strip-tabpanel-tax"
            role="tabpanel"
            aria-labelledby="strip-tab-tax"
            hidden={snapshotTab !== "tax"}
            className="strip-snapshot-tabpanel"
          >
            <StripTaxNarrative td={td} annTax={c.annTax} />
          </div>
      </SidePanelShell>
    </>
  );
}
