import { LifeEventFloatingCurrencyField } from './LifeEventFloatingField'
import type { HsaOffsetResult } from './utils'
import { formatCurrency } from './utils'

export interface LifeEventHsaBlockProps {
  hsaResult: HsaOffsetResult
  hsaBalance: number
  hsaSavings: number
  hsaOffsetAmount: number
  onHsaOffsetChange: (amount: number) => void
}

export function LifeEventHsaBlock({
  hsaResult,
  hsaBalance,
  hsaSavings,
  hsaOffsetAmount,
  onHsaOffsetChange,
}: LifeEventHsaBlockProps) {
  const { grossExpense, hsaOffset, netExpense, fullyCovered, hasHsa } = hsaResult

  if (fullyCovered) {
    return (
      <div className="life-events-hsa life-events-hsa--teal">
        <div className="life-events-hsa__header">
          <span className="life-events-hsa__header-label">Fully covered by HSA</span>
          <span className="life-events-hsa__pill life-events-hsa__pill--teal">
            No portfolio impact
          </span>
        </div>
        <p className="life-events-hsa__body">
          Your HSA balance of {formatCurrency(hsaBalance)} fully covers this expense. Your
          retirement portfolio is untouched. Your HSA is doing exactly what it was designed for.
        </p>
      </div>
    )
  }

  if (hasHsa && hsaOffset > 0) {
    return (
      <div className="life-events-hsa life-events-hsa--teal">
        <div className="life-events-hsa__header">
          <span className="life-events-hsa__header-label">HSA offset</span>
          <span className="life-events-hsa__pill life-events-hsa__pill--teal">
            HSA covers {formatCurrency(hsaOffset)}
          </span>
        </div>
        <div className="life-events-hsa__breakdown">
          <div className="life-events-hsa__breakdown-row">
            <span>Gross expense</span>
            <span>{formatCurrency(grossExpense)}</span>
          </div>
          <div className="life-events-hsa__breakdown-row life-events-hsa__breakdown-row--offset">
            <span>HSA offset</span>
            <LifeEventFloatingCurrencyField
              id="life-events-hsa-offset"
              label="HSA offset amount"
              value={hsaOffsetAmount}
              min={0}
              max={grossExpense}
              onChange={(amount) => onHsaOffsetChange(amount)}
              className="life-events-hsa__offset-input"
            />
          </div>
          <div className="life-events-hsa__breakdown-divider" aria-hidden />
          <div className="life-events-hsa__breakdown-row life-events-hsa__breakdown-row--net">
            <span>Net portfolio hit</span>
            <span>{formatCurrency(netExpense)}</span>
          </div>
        </div>
        <p className="life-events-hsa__savings">
          Your HSA saves you {formatCurrency(hsaSavings)} in lost compounding compared to paying
          this from your retirement portfolio.
        </p>
      </div>
    )
  }

  return (
    <div className="life-events-hsa life-events-hsa--amber">
      <div className="life-events-hsa__header">
        <span className="life-events-hsa__header-label">No HSA on file</span>
        <span className="life-events-hsa__pill life-events-hsa__pill--amber">Consider an HSA</span>
      </div>
      <p className="life-events-hsa__body">
        The full {formatCurrency(grossExpense)} comes from your retirement portfolio. An HSA is
        one of the most tax-efficient tools for medical costs in retirement. Contributions go in
        pre-tax, grow tax-free, and withdraw tax-free for qualified medical expenses. Even a modest
        HSA balance reduces what retirement has to cover.
      </p>
    </div>
  )
}
