import { IconArrowNarrowRightDashed } from "@tabler/icons-react";
import { AccountBucketMonthlyIncomePill } from "./AccountBucketMonthlyIncomePill";
import { AccountIncomeStrategyCards } from "./AccountIncomeStrategyCards";
import { PortfolioBucketAccountRow } from "./PortfolioBucketAccountRow";
import {
  formatRunwayYearsDisplay,
  runwayYearsToneClass,
  type AccountIncomeBreakdown,
  type AccountIncomeStrategy,
} from "../lib/accountIncomeStrategy";
import type { IncomeAccordionContent } from "../lib/incomeAccountAccordionContent";
import type { AccountScenarioBucketId } from "../lib/accountReturnScenario";
import { fmt } from "../utils/format";
import { IncomeAccountRecommendation } from "./IncomeAccountRecommendation";
import { IncomeAccountRowDetail } from "./IncomeAccountRowDetail";
import "./AccountBalancesTaxDisclosure.scss";
import "./IncomeAccountRow.scss";

type Props = {
  label: string;
  balanceAtRetirement: number;
  bucket: AccountScenarioBucketId;
  selectedTicker: string;
  strategy: AccountIncomeStrategy;
  onStrategyChange: (strategy: AccountIncomeStrategy) => void;
  withdrawRate: number;
  onWithdrawRateChange: (rate: number) => void;
  breakdown: AccountIncomeBreakdown;
  accordionContent?: IncomeAccordionContent | null;
  badgeOrder?: number | null;
  onFundSelect: (ticker: string) => void;
};

export function IncomeAccountRow({
  label,
  balanceAtRetirement,
  bucket,
  selectedTicker,
  strategy,
  onStrategyChange,
  withdrawRate,
  onWithdrawRateChange,
  breakdown,
  accordionContent = null,
  badgeOrder = null,
  onFundSelect,
}: Props) {
  const strategySubtext = (
    <span className="income-account-row__strategy-line">
      <span className="income-account-row__strategy-badge">
        {breakdown.strategyBadgeLabel}
      </span>
      {breakdown.runwayYears != null ? (
        <span className="income-account-row__runway-inline">
          <span className="income-account-row__runway-arrow" aria-hidden>
            <IconArrowNarrowRightDashed size={12} stroke={1.15} />
          </span>
          This will last{" "}
          <strong
            className={[
              "income-account-row__runway-years",
              runwayYearsToneClass(breakdown.runwayYears),
            ].join(" ")}
          >
            {formatRunwayYearsDisplay(breakdown.runwayYears)} years
          </strong>
          .
        </span>
      ) : null}
    </span>
  );

  return (
    <details className="tax-treatment-disclosure portfolio-account-group income-account-row">
      <summary className="tax-treatment-disclosure__summary portfolio-bucket-account-summary">
        <PortfolioBucketAccountRow
          badgeOrder={badgeOrder}
          label={label}
          amountBesideScenario
          subtext={strategySubtext}
          total={
            <AccountBucketMonthlyIncomePill
              monthlyIncome={breakdown.monthlyTotal}
            />
          }
          valuesExtra={
            <span
              className="income-account-row__balance"
              aria-label="Projected balance at retirement"
            >
              {fmt(balanceAtRetirement)}
            </span>
          }
          showViewHoldings
        />
      </summary>
      <div className="tax-treatment-disclosure__body tax-treatment-disclosure__body--import-style income-account-row__body">
        <div className="income-account-row__controls-section">
          <AccountIncomeStrategyCards
            strategy={strategy}
            onStrategyChange={onStrategyChange}
            breakdown={breakdown}
            bucket={bucket}
            selectedTicker={selectedTicker}
            onFundSelect={onFundSelect}
            withdrawRate={withdrawRate}
            onWithdrawRateChange={onWithdrawRateChange}
          />
        </div>
        <div className="income-account-row__recommendation-section">
          <IncomeAccountRecommendation bucket={bucket} />
        </div>
        {accordionContent ? (
          <>
            <hr className="income-account-row__divider" aria-hidden />
            <div className="income-account-row__detail-section">
              <IncomeAccountRowDetail content={accordionContent} />
            </div>
          </>
        ) : null}
      </div>
    </details>
  );
}
