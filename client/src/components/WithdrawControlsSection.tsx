import { useCallback, useRef, useState } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'
import { IncomeModeDropdown } from './IncomeModeDropdown'
import './YieldControlsSection.scss'

type Props = {
  incomeMode: boolean
  onIncomeMode: (incomeMode: boolean) => void
  wdRate: number
  onWdRate: (r: number) => void
  wdPctDisplay: number
  wdInflation: number
  onWdInflation: (x: number) => void
  wdInflPctDisplay: number
}

function InflationAdjustmentPopover({
  wdInflation,
  onWdInflation,
  wdInflPctDisplay,
}: {
  wdInflation: number
  onWdInflation: (x: number) => void
  wdInflPctDisplay: number
}) {
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(popoverRef, close, open, [triggerRef])

  return (
    <span className="yield-inflation-adjust">
      <button
        ref={triggerRef}
        type="button"
        className="infl-pill"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="strip-income-inflation-popover"
        aria-label={`Inflation adjustment ${wdInflPctDisplay.toFixed(1)}%`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((prev) => !prev)
        }}
      >
        {wdInflPctDisplay.toFixed(1)}%
      </button>
      <span className="muted-label">inflation adjustment</span>
      {open ? (
        <div
          ref={popoverRef}
          id="strip-income-inflation-popover"
          className="strip-income-nav-popover yield-inflation-adjust__popover"
          role="dialog"
          aria-labelledby="strip-income-inflation-popover-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div id="strip-income-inflation-popover-title" className="strip-income-nav-popover__title">
            Inflation adjustment
          </div>
          <div className="strip-income-nav-popover__value-row">
            <span className="strip-equation-main-val strip-equation-main-val--accent strip-equation-main-val--tween">
              +{wdInflPctDisplay.toFixed(2)}%
            </span>
          </div>
          <div className="range-inline-row strip-income-nav-popover__slider">
            <input
              type="range"
              min={0}
              max={6}
              step={0.25}
              value={wdInflation * 100}
              onChange={(e) => onWdInflation(Number(e.target.value) / 100)}
              aria-valuemin={0}
              aria-valuemax={6}
              aria-valuenow={wdInflation * 100}
              aria-label="Annual inflation uplift on withdrawal rate"
            />
            <div className="range-inline-ticks">
              <span className="range-inline-tick">0%</span>
              <span className="range-inline-tick range-inline-tick--end">6%</span>
            </div>
          </div>
          <div className="strip-income-nav-popover__explain">
            <p className="strip-income-nav-popover__body">
              Multiplier on top of the base withdrawal rate: annual withdrawal is modeled as portfolio ×
              withdrawal rate × <strong>(1 + this adjustment)</strong>. Use it to stress-test a higher draw
              than the headline percentage alone.
            </p>
          </div>
          <p className="strip-income-nav-popover__hint">
            Slide to set the extra uplift (0–6%) applied together with the withdrawal percentage above.
          </p>
        </div>
      ) : null}
    </span>
  )
}

export function WithdrawControlsSection({
  incomeMode,
  onIncomeMode,
  wdRate,
  onWdRate,
  wdPctDisplay,
  wdInflation,
  onWdInflation,
  wdInflPctDisplay,
}: Props) {
  return (
    <div className="yield-controls">
      <div className="yield-controls__metric strip-income-metric-stack">
        <span className="strip-income-metric-stack__pct strip-equation-main-val--accent strip-equation-main-val--tween">
          {wdPctDisplay.toFixed(1)}%
        </span>
        <span className="strip-income-metric-stack__caption">Withdrawal rate on portfolio</span>
      </div>

      <div className="yield-controls__slider strip-equation-sliders-group">
        <div className="range-inline-row">
          <input
            type="range"
            min={3}
            max={7}
            step={0.1}
            value={wdRate * 100}
            onChange={(e) => onWdRate(Number(e.target.value) / 100)}
            aria-label="Withdrawal rate percent"
          />
          <div className="range-inline-ticks">
            <span className="range-inline-tick">3%</span>
            <span className="range-inline-tick range-inline-tick--end">7%</span>
          </div>
        </div>
      </div>

      <div className="yield-controls-row yield-controls-row--withdraw">
        <IncomeModeDropdown incomeMode={incomeMode} onIncomeMode={onIncomeMode} />
        <span className="muted-label">with</span>
        <InflationAdjustmentPopover
          wdInflation={wdInflation}
          onWdInflation={onWdInflation}
          wdInflPctDisplay={wdInflPctDisplay}
        />
      </div>
    </div>
  )
}
