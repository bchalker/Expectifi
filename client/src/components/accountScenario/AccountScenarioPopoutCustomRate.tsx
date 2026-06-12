import { IconMinus, IconPlus } from '@tabler/icons-react'
import { parseScenarioPct } from '../HoldingScenarioPopout'
import './AccountScenarioPopoutCustomRate.scss'

const CUSTOM_RATE_STEP = 0.25

const PRIMARY_BENCHMARK = {
  label: 'S&P 500',
  display: '~10%',
  valuePct: 10,
} as const

const SECONDARY_BENCHMARKS = [
  { label: 'Balanced', display: '~6 - 7%', valuePct: 6.5 },
  { label: 'Conservative', display: '~4 - 5%', valuePct: 4.5 },
  { label: 'Money Market', display: '~4 - 5%', valuePct: 4.3 },
] as const

function clampPct(n: number): number {
  return Math.max(-100, Math.min(100, Math.round(n * 100) / 100))
}

type Props = {
  draftPct: string
  onDraftPctChange: (value: string) => void
  onDraftPctBlur: () => void
}

export function AccountScenarioPopoutCustomRate({
  draftPct,
  onDraftPctChange,
  onDraftPctBlur,
}: Props) {
  const ratePct = parseScenarioPct(draftPct)

  const stepRate = (direction: -1 | 1) => {
    const next = clampPct(ratePct + direction * CUSTOM_RATE_STEP)
    onDraftPctChange(String(next))
  }

  const pickBenchmark = (valuePct: number) => {
    onDraftPctChange(String(clampPct(valuePct)))
  }

  const isActive = (valuePct: number) => Math.abs(ratePct - valuePct) < 0.01

  return (
    <div className="account-scenario-popout-custom-rate">
      <div className="account-scenario-popout-custom-rate__stepper">
        <button
          type="button"
          className="account-scenario-popout-custom-rate__step-btn"
          aria-label="Decrease annual return by 0.25%"
          onClick={() => stepRate(-1)}
        >
          <IconMinus size={16} stroke={1.25} aria-hidden />
        </button>
        <div className="account-scenario-popout-custom-rate__value-wrap">
          <input
            type="text"
            inputMode="decimal"
            className="account-scenario-popout-custom-rate__input"
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
          <span className="account-scenario-popout-custom-rate__suffix" aria-hidden>
            %
          </span>
        </div>
        <button
          type="button"
          className="account-scenario-popout-custom-rate__step-btn"
          aria-label="Increase annual return by 0.25%"
          onClick={() => stepRate(1)}
        >
          <IconPlus size={16} stroke={1.25} aria-hidden />
        </button>
      </div>

      <div className="account-scenario-popout-custom-rate__divider" aria-hidden />

      <div className="account-scenario-popout-custom-rate__benchmarks" role="group" aria-label="Benchmark presets">
        <button
          type="button"
          className={[
            'account-scenario-popout-custom-rate__benchmark',
            'account-scenario-popout-custom-rate__benchmark--full',
            isActive(PRIMARY_BENCHMARK.valuePct) &&
              'account-scenario-popout-custom-rate__benchmark--active',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-pressed={isActive(PRIMARY_BENCHMARK.valuePct)}
          onClick={() => pickBenchmark(PRIMARY_BENCHMARK.valuePct)}
        >
          <span className="account-scenario-popout-custom-rate__benchmark-label">
            {PRIMARY_BENCHMARK.label}
          </span>
          <span className="account-scenario-popout-custom-rate__benchmark-value">
            {PRIMARY_BENCHMARK.display}
          </span>
        </button>

        <div className="account-scenario-popout-custom-rate__benchmark-row">
          {SECONDARY_BENCHMARKS.map((row) => (
            <button
              key={row.label}
              type="button"
              className={[
                'account-scenario-popout-custom-rate__benchmark',
                isActive(row.valuePct) && 'account-scenario-popout-custom-rate__benchmark--active',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={isActive(row.valuePct)}
              onClick={() => pickBenchmark(row.valuePct)}
            >
              <span className="account-scenario-popout-custom-rate__benchmark-label">{row.label}</span>
              <span className="account-scenario-popout-custom-rate__benchmark-value">{row.display}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
