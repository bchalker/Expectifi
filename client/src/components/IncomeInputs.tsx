import { Switch } from '@heroui/react'
import type { CalculatorInputs, CalculatorUi, ComputedSnapshot } from '../lib/computeResults'
import { fmt, fmtK, fmtMon } from '../utils/format'
import { InlineSliderRow } from './InlineSliderRow'

type Props = {
  c: ComputedSnapshot
  ui: CalculatorUi
  setUi: (u: Partial<CalculatorUi>) => void
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
}

export function IncomeInputs({ c, ui, setUi, inputs, setInputs }: Props) {
  const ip = c.incomePhase
  const ss = c.ss
  const spouseEligible = inputs.ssAge >= 64
  const spouseAge = spouseEligible ? inputs.ssAge - 2 : 62
  const ra = inputs.targetRetirementAge
  const yTo70 = Math.max(0, 70 - ra)
  const yTo80 = Math.max(0, 80 - ra)

  const principalClass = ip && ip.port80 >= c.totalFV ? 'accent' : 'warn'
  const diffColor = ip && ip.diff >= 0 ? 'var(--accent-text)' : 'var(--danger)'

  return (
    <>
      {ui.incomeMode ? (
        <div className="input-col-title" style={{ marginBottom: '1.25rem' }}>
          Dividend fund settings
        </div>
      ) : null}

      {ip && c.hasPortfolioBalances ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div className="strip-card accent" style={{ flex: 1, minWidth: 130 }}>
            <div className="strip-card-label">Income at {ra}</div>
            <div className="strip-card-val">{fmtMon(ip.inc62)}</div>
            <div className="strip-card-sub">yield · SS reinvested</div>
          </div>
          <div className="strip-card accent" style={{ flex: 1, minWidth: 130 }}>
            <div className="strip-card-label">Income at 70</div>
            <div className="strip-card-val">{fmtMon(ip.inc70)}</div>
            <div className="strip-card-sub">{yTo70} yrs SS compounding</div>
          </div>
          <div className="strip-card accent" style={{ flex: 1, minWidth: 130 }}>
            <div className="strip-card-label">Income at 80</div>
            <div className="strip-card-val">{fmtMon(ip.inc80)}</div>
            <div className="strip-card-sub">{yTo80} yrs SS compounding</div>
          </div>
          <div className="strip-card gold" style={{ flex: 1, minWidth: 130 }}>
            <div className="strip-card-label">SS reinvested/mo</div>
            <div className="strip-card-val">{ui.ssIncluded ? fmtMon(c.totalSS) : '$0 (SS excluded)'}</div>
            <div className="strip-card-sub">into dividend fund</div>
          </div>
          <div className={`strip-card ${principalClass}`} style={{ flex: 1, minWidth: 130 }}>
            <div className="strip-card-label">Portfolio at 80</div>
            <div className="strip-card-val">{fmtK(ip.port80)}</div>
            <div className="strip-card-sub">
              {inputs.incGrowth >= 0
                ? `+${(inputs.incGrowth * 100).toFixed(1)}%/yr NAV · SS compounding`
                : `${(inputs.incGrowth * 100).toFixed(1)}%/yr NAV erosion · SS partially offsets`}
            </div>
          </div>
          <div className="strip-card" style={{ flex: 1, minWidth: 130 }}>
            <div className="strip-card-label">vs. withdrawal at {ra}</div>
            <div className="strip-card-val" style={{ color: diffColor }}>
              {(ip.diff >= 0 ? '+' : '') + fmt(ip.diff)}/mo
            </div>
            <div className="strip-card-sub">monthly difference</div>
          </div>
        </div>
      ) : null}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div className="input-col-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            Income sources
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', borderRadius: 8, padding: '6px 12px' }}>
            <div className="toggle-label-primary">Include SS</div>
            <div className="toggle-label-secondary">Off = yield only</div>
            <Switch
              isSelected={ui.ssIncluded}
              onChange={(selected) => setUi({ ssIncluded: selected })}
              size="sm"
            >
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch>
          </div>
        </div>
        <div id="ss-sliders" style={{ opacity: ui.ssIncluded ? 1 : 0.4 }}>
          <InlineSliderRow
            name="Your SS age"
            valueLabel={`${inputs.ssAge} · ${fmtMon(ss)}`}
            min={62}
            max={70}
            step={1}
            value={inputs.ssAge}
            onChange={(v) => setInputs({ ssAge: v })}
            tickLeft="62 · $1,949"
            tickMid="67 · $2,916"
            tickRight="70 · $3,704"
          />
          <div className="inline-slider-row" style={{ borderBottom: 'none' }}>
            <div className="isr-label">
              <span className="isr-name">Spouse SS age</span>
              <span className="isr-val">
                {spouseAge} · {fmtMon(c.spouseSS)}
              </span>
              <span
                className="isr-note"
                style={{
                  color: spouseEligible ? 'var(--text-faint)' : 'var(--danger)',
                }}
              >
                {spouseEligible ? `synced · she draws at ${spouseAge}` : 'not yet eligible — she turns 62 when you are 64'}
              </span>
            </div>
            <div className="isr-track">
              <div className="range-inline-row">
                <input
                  type="range"
                  min={62}
                  max={70}
                  step={1}
                  value={spouseAge}
                  disabled
                  style={{ opacity: 0.25, cursor: 'not-allowed' }}
                  onChange={() => {}}
                />
                <div className="range-inline-ticks">
                  <span className="range-inline-tick">62 · $974</span>
                  <span className="range-inline-tick range-inline-tick--end">70 · $1,852</span>
                </div>
                <div className="range-inline-mid">67 · $1,458</div>
              </div>
            </div>
          </div>
          <InlineSliderRow
            name="Other income"
            valueLabel={inputs.other > 0 ? fmt(inputs.other) : '$0'}
            min={0}
            max={40000}
            step={500}
            value={inputs.other}
            onChange={(v) => setInputs({ other: v })}
            tickLeft="$0"
            tickMid="$20k"
            tickRight="$40k/yr"
            borderBottomNone
          />
        </div>
      </div>
    </>
  )
}
