import { useMemo } from 'react'
import { IconArrowDown, IconArrowUp, IconMinus, IconPlus } from '@tabler/icons-react'
import { parseScenarioPct } from './HoldingScenarioPopout'
import { blendedBaselineFV } from '../lib/positionReturnModel'
import { horizonClamp } from '../lib/holdingScenarioApply'
import { useAnimatedScalar } from '../hooks/useAnimatedScalar'
import { fmtK } from '../utils/format'
import './AccountCustomRateTab.scss'

const CUSTOM_RATE_STEP = 0.25

const BENCHMARKS: { label: string; display: string; valuePct: number }[] = [
  { label: 'S&P 500', display: '~10%', valuePct: 10 },
  { label: 'Balanced', display: '~6–7%', valuePct: 6.5 },
  { label: 'Conservative', display: '~4–5%', valuePct: 4.5 },
  { label: 'Money market', display: '~4.3%', valuePct: 4.3 },
]

function clampPct(n: number): number {
  return Math.max(-100, Math.min(100, Math.round(n * 100) / 100))
}

function formatGlobalRatePct(rate: number): string {
  const pct = rate * 100
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1)
}

function AnimatedProjectionAmount({ value }: { value: number }) {
  const animated = useAnimatedScalar(value, 420)
  return (
    <strong className="account-custom-rate-tab__preview-amount">{`~${fmtK(animated)}`}</strong>
  )
}

function AnimatedDeltaAmount({ value }: { value: number }) {
  const animated = useAnimatedScalar(Math.abs(value), 420)
  return <span className="account-custom-rate-tab__delta-amount">{fmtK(animated)}</span>
}

type Props = {
  accountName: string
  draftPct: string
  onDraftPctChange: (value: string) => void
  onDraftPctBlur: () => void
  globalBlended: number
  currentBalance: number
  horizon: number
  targetRetirementAge: number
  compact?: boolean
}

export function AccountCustomRateTab({
  accountName: _accountName,
  draftPct,
  onDraftPctChange,
  onDraftPctBlur,
  globalBlended,
  currentBalance,
  horizon,
  targetRetirementAge,
  compact = false,
}: Props) {
  void _accountName
  const h = horizonClamp(horizon)
  const ratePct = parseScenarioPct(draftPct)
  const rateDec = ratePct / 100

  const { projected, delta } = useMemo(() => {
    if (!(currentBalance > 0)) {
      return { projected: 0, delta: 0 }
    }
    const atRate = blendedBaselineFV(currentBalance, rateDec, h)
    const atGlobal = blendedBaselineFV(currentBalance, globalBlended, h)
    return { projected: atRate, delta: atRate - atGlobal }
  }, [currentBalance, globalBlended, h, rateDec])

  const stepRate = (direction: -1 | 1) => {
    const next = clampPct(ratePct + direction * CUSTOM_RATE_STEP)
    onDraftPctChange(String(next))
  }

  const pickBenchmark = (valuePct: number) => {
    onDraftPctChange(String(clampPct(valuePct)))
  }

  const showDelta = Math.abs(delta) >= 500
  const deltaMore = delta > 0

  return (
    <div className="account-custom-rate-tab">
      <div className="account-custom-rate-tab__stepper-row">
        <button
          type="button"
          className="account-custom-rate-tab__step-btn"
          aria-label="Decrease annual return by 0.25%"
          onClick={() => stepRate(-1)}
        >
          <IconMinus size={16} stroke={1.5} aria-hidden />
        </button>
        <div className="account-custom-rate-tab__value-wrap">
          <input
            id="holding-scenario-custom-pct"
            type="text"
            inputMode="decimal"
            className="account-custom-rate-tab__input"
            value={draftPct}
            onChange={(e) => onDraftPctChange(e.target.value)}
            onBlur={onDraftPctBlur}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                stepRate(1)
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                stepRate(-1)
              }
            }}
            aria-label="Annual return percent"
          />
          <span className="account-custom-rate-tab__suffix" aria-hidden>
            %
          </span>
        </div>
        <button
          type="button"
          className="account-custom-rate-tab__step-btn"
          aria-label="Increase annual return by 0.25%"
          onClick={() => stepRate(1)}
        >
          <IconPlus size={16} stroke={1.5} aria-hidden />
        </button>
      </div>

      <div className="account-custom-rate-tab__preview" role="status">
        <p
          className={[
            'account-custom-rate-tab__preview-line',
            compact
              ? 'account-custom-rate-tab__preview-line--compact'
              : 'account-custom-rate-tab__preview-line--headline',
          ].join(' ')}
        >
          <AnimatedProjectionAmount value={projected} />
          <span className="account-custom-rate-tab__preview-age"> at {targetRetirementAge}</span>
        </p>
        {!compact && showDelta ? (
          <p className="account-custom-rate-tab__preview-line account-custom-rate-tab__preview-line--delta">
            <span
              className={[
                'account-custom-rate-tab__delta-pill',
                deltaMore
                  ? 'account-custom-rate-tab__delta-pill--positive'
                  : 'account-custom-rate-tab__delta-pill--negative',
              ].join(' ')}
            >
              {deltaMore ? (
                <IconArrowUp
                  className="account-custom-rate-tab__delta-icon"
                  stroke={1.5}
                  aria-hidden
                />
              ) : (
                <IconArrowDown
                  className="account-custom-rate-tab__delta-icon"
                  stroke={1.5}
                  aria-hidden
                />
              )}
              <AnimatedDeltaAmount value={delta} />
            </span>
            {deltaMore ? ' more' : ' less'} than global rate ({formatGlobalRatePct(globalBlended)}%)
          </p>
        ) : null}
      </div>

      <div className="account-custom-rate-tab__benchmarks">
        <span className="account-custom-rate-tab__benchmarks-label">Common benchmarks</span>
        <div
          className="account-custom-rate-tab__benchmark-group"
          role="group"
          aria-label="Common benchmarks"
        >
          {BENCHMARKS.map((row) => {
            const isActive = Math.abs(ratePct - row.valuePct) < 0.01
            return (
              <button
                key={row.label}
                type="button"
                className={[
                  'account-custom-rate-tab__benchmark-btn',
                  isActive ? 'account-custom-rate-tab__benchmark-btn--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={isActive}
                onClick={() => pickBenchmark(row.valuePct)}
              >
                <span className="font-xs account-custom-rate-tab__benchmark-label">{row.label}</span>
                <span className="font-base account-custom-rate-tab__benchmark-value">{row.display}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
