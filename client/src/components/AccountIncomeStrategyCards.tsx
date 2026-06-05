import { useCallback, useState, type ReactNode } from 'react'
import { IncomeSecuritySelector } from './IncomeSecuritySelector'
import { Toggle } from './ui/Toggle'
import {
  ACCOUNT_WITHDRAW_RATE_MAX,
  ACCOUNT_WITHDRAW_RATE_MIN,
  strategyFromToggles,
  togglesFromStrategy,
  type AccountIncomeBreakdown,
  type AccountIncomeStrategy,
} from '../lib/accountIncomeStrategy'
import type { AccountScenarioBucketId } from '../lib/accountReturnScenario'
import { fmt, fmtMon } from '../utils/format'
import './AccountIncomeStrategyCards.scss'

type Props = {
  strategy: AccountIncomeStrategy
  onStrategyChange: (strategy: AccountIncomeStrategy) => void
  breakdown: AccountIncomeBreakdown
  bucket: AccountScenarioBucketId
  selectedTicker: string
  onFundSelect: (ticker: string) => void
  withdrawRate: number
  onWithdrawRateChange: (rate: number) => void
}

export function AccountIncomeStrategyCards({
  strategy,
  onStrategyChange,
  breakdown,
  bucket,
  selectedTicker,
  onFundSelect,
  withdrawRate,
  onWithdrawRateChange,
}: Props) {
  const { dividendOn, withdrawOn } = togglesFromStrategy(strategy)
  const isHsaMedical = bucket === 'hsa' && withdrawOn

  const setDividendOn = (on: boolean) => {
    onStrategyChange(strategyFromToggles(on, withdrawOn))
  }

  const setWithdrawOn = (on: boolean) => {
    onStrategyChange(strategyFromToggles(dividendOn, on))
  }

  const dividendStrip = (
    <StrategyStrip
      variant="dividend"
      active={dividendOn}
      title="Dividend payout"
      income={breakdown.monthlyDividend}
      onToggle={setDividendOn}
      toggleLabel="Dividend payout"
      wrapControlsPanel={false}
    >
      <IncomeSecuritySelector
        selectedTicker={selectedTicker}
        onSelect={(ticker) => {
          if (ticker != null) onFundSelect(ticker)
        }}
        allowCustom={false}
        triggerVariant="badge"
        showYieldInBadgeTrigger
        className="income-strategy-strip__fund-select"
      />
    </StrategyStrip>
  )

  const withdrawStrip = (
    <StrategyStrip
      variant="withdraw"
      active={withdrawOn}
      title="Withdraw from principal"
      income={breakdown.monthlyWithdraw}
      onToggle={setWithdrawOn}
      toggleLabel="Withdraw from principal"
      wrapControlsPanel={false}
    >
      {isHsaMedical ? (
        <div className="income-strategy-strip__withdraw-stack">
          <span className="income-strategy-strip__rate-label">Medical draw</span>
          <span className="income-strategy-strip__rate-value tabular-nums">
            {fmtMon(breakdown.monthlyWithdraw)}/mo
          </span>
          {breakdown.preservedBalance != null ? (
            <span className="income-strategy-strip__rate-hint">
              {fmt(breakdown.preservedBalance)} preserved
            </span>
          ) : null}
        </div>
      ) : (
        <WithdrawRatePercentInput
          rate={withdrawRate}
          min={ACCOUNT_WITHDRAW_RATE_MIN}
          max={ACCOUNT_WITHDRAW_RATE_MAX}
          onRateChange={onWithdrawRateChange}
        />
      )}
    </StrategyStrip>
  )

  return (
    <div className="income-strategy-strip-row">
      <div className="income-strategy-strip-row__strips income-strategy-strip-row__strips--dual">
        {dividendStrip}
        {withdrawStrip}
      </div>
    </div>
  )
}

function StrategyStrip({
  active,
  title,
  income,
  onToggle,
  toggleLabel,
  variant,
  wrapControlsPanel = true,
  children,
}: {
  active: boolean
  title: string
  income: number
  onToggle: (on: boolean) => void
  toggleLabel: string
  variant?: 'dividend' | 'withdraw'
  wrapControlsPanel?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={[
        'income-strategy-strip',
        variant === 'dividend' ? 'income-strategy-strip--dividend' : '',
        variant === 'withdraw' ? 'income-strategy-strip--withdraw' : '',
        active ? 'income-strategy-strip--on' : 'income-strategy-strip--off',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="income-strategy-strip__inner">
        <Toggle
          value={active}
          onChange={onToggle}
          accessibilityLabel={toggleLabel}
          className="income-strategy-strip__toggle ui-toggle--switch-only"
        />
        <div className="income-strategy-strip__identity">
          <span className="income-strategy-strip__title">{title}</span>
          {active ? (
            <div className="income-strategy-strip__income-line">
              <span className="income-strategy-strip__income-label">Income</span>
              <span className="income-strategy-strip__income-value tabular-nums">{fmtMon(income)}</span>
            </div>
          ) : null}
        </div>
        <div className="income-strategy-strip__divider" aria-hidden />
        {wrapControlsPanel ? (
          <div className="income-strategy-strip__controls-panel">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function sanitizePercentDraft(raw: string): string {
  let s = raw.replace(/[^\d.]/g, '')
  const dot = s.indexOf('.')
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '')
  }
  return s
}

function formatPercentDisplay(pct: number): string {
  const rounded = Math.round(pct * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function WithdrawRatePercentInput({
  rate,
  min,
  max,
  onRateChange,
}: {
  rate: number
  min: number
  max: number
  onRateChange: (rate: number) => void
}) {
  const pct = rate * 100
  const [draft, setDraft] = useState<string | null>(null)

  const displayValue = draft ?? formatPercentDisplay(pct)

  const commitPct = useCallback(
    (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed || trimmed === '.') return
      const parsed = parseFloat(trimmed)
      if (!Number.isFinite(parsed) || parsed <= 0) return
      const clampedPct = Math.min(max * 100, Math.max(min * 100, parsed))
      onRateChange(clampedPct / 100)
    },
    [max, min, onRateChange],
  )

  return (
    <div className="income-strategy-strip__rate-field">
      <span className="income-strategy-strip__rate-value-row">
        <input
          type="text"
          inputMode="decimal"
          className="income-strategy-strip__rate-input tabular-nums"
          value={displayValue}
          aria-label="Withdraw rate"
          onFocus={() => setDraft(formatPercentDisplay(pct))}
          onBlur={() => {
            if (draft != null) commitPct(draft)
            setDraft(null)
          }}
          onChange={(e) => {
            const next = sanitizePercentDraft(e.target.value)
            setDraft(next)
            if (next && next !== '.') commitPct(next)
          }}
        />
        <span className="income-strategy-strip__rate-suffix" aria-hidden>
          %
        </span>
      </span>
    </div>
  )
}
