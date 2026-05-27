import { useCallback, useRef, useState } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'
import { IncomeModeDropdown } from './IncomeModeDropdown'
import { IncomeSecuritySelector } from './IncomeSecuritySelector'
import { RangeInlineWithValuePinRow } from './StripSliderValuePin'
import './YieldControlsSection.scss'

type Props = {
  incomeMode: boolean
  onIncomeMode: (incomeMode: boolean) => void
  incYield: number
  onIncYield: (y: number) => void
  incYieldPctDisplay: number
  incGrowthPctDisplay: number
  incomeSecurityTicker: string | null
  onIncomeSecuritySelect: (ticker: string | null) => void
}

function NavErosionPopover({ incGrowthPctDisplay }: { incGrowthPctDisplay: number }) {
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(popoverRef, close, open, [triggerRef])

  const amountLabel = `+${Math.abs(incGrowthPctDisplay).toFixed(1)}%`

  return (
    <span className="yield-nav-erosion">
      <button
        ref={triggerRef}
        type="button"
        className="nav-erosion-link muted-label"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="strip-income-nav-popover"
        aria-label={`NAV erosion ${amountLabel}`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((prev) => !prev)
        }}
      >
        NAV erosion
      </button>
      <span className="nav-amount" aria-hidden>
        {amountLabel}
      </span>
      {open ? (
        <div
          ref={popoverRef}
          id="strip-income-nav-popover"
          className="strip-income-nav-popover yield-nav-erosion__popover"
          role="dialog"
          aria-labelledby="strip-income-nav-popover-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div id="strip-income-nav-popover-title" className="strip-income-nav-popover__title">
            What is NAV erosion?
          </div>
          <div className="strip-income-nav-popover__explain">
            <p className="strip-income-nav-popover__body">
              Some high-yield funds pay distributions that are not fully covered by underlying
              investment income alone. Part of the cash flow can come from mechanics that tend to
              pull down the fund&apos;s <strong>net asset value (NAV)</strong>—the price per
              share—even when the dividend looks steady. In this model, a{' '}
              <strong>positive</strong> yearly drift reflects expected NAV erosion from that effect,
              before other market forces.
            </p>
            <p className="strip-income-nav-popover__body strip-income-nav-popover__body--example">
              <span className="strip-income-nav-popover__example-label">Example:</span> You buy a
              fund at <strong>$50</strong> per share. If you set <strong>+4% NAV erosion per year</strong>,
              you are saying the share price might trend toward roughly <strong>$48</strong> after a
              year from erosion alone, even if you reinvest distributions.
            </p>
          </div>
          <p className="strip-income-nav-popover__hint">
            This value is set from your selected security. Pick a different fund to change it.
          </p>
        </div>
      ) : null}
    </span>
  )
}

export function YieldControlsSection({
  incomeMode,
  onIncomeMode,
  incYield,
  onIncYield,
  incYieldPctDisplay,
  incGrowthPctDisplay,
  incomeSecurityTicker,
  onIncomeSecuritySelect,
}: Props) {
  return (
    <div className="yield-controls">

      <div className="yield-controls__slider strip-equation-sliders-group">
        <RangeInlineWithValuePinRow
          pinPct={`${incYieldPctDisplay.toFixed(2)}%`}
          pinCaption="Yield"
          pinPctClassName="strip-equation-main-val--accent strip-equation-main-val--tween"
          track={
            <input
              type="range"
              min={2}
              max={20}
              step={0.25}
              value={incYield * 100}
              onChange={(e) => onIncYield(Number(e.target.value) / 100)}
              aria-label="Dividend yield percent"
            />
          }
          ticks={
            <div className="range-inline-ticks">
              <span className="range-inline-tick">2%</span>
              <span className="range-inline-tick range-inline-tick--end">20%</span>
            </div>
          }
        />
      </div>

      <div className="yield-controls-row">
        <div className="yield-controls-row__left">
          <IncomeModeDropdown incomeMode={incomeMode} onIncomeMode={onIncomeMode} />
          <span className="muted-label yield-controls-row__via">yield via</span>
          <IncomeSecuritySelector
            selectedTicker={incomeSecurityTicker}
            onSelect={onIncomeSecuritySelect}
            triggerClassName="dd-trigger"
          />
        </div>
        <span className="muted-label yield-controls-row__with">with</span>
        <NavErosionPopover incGrowthPctDisplay={incGrowthPctDisplay} />
      </div>
    </div>
  )
}
