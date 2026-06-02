import { useCallback, useId, useRef, useState, type RefObject } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'
import './IncomeGlobalInflationControl.scss'

type Props = {
  wdInflation: number
  onWdInflation: (value: number) => void
}

function InflationAdjustmentPopoverPanel({
  wdInflation,
  onWdInflation,
  popoverId,
  titleId,
  popoverRef,
}: {
  wdInflation: number
  onWdInflation: (value: number) => void
  popoverId: string
  titleId: string
  popoverRef: RefObject<HTMLDivElement | null>
}) {
  const pctDisplay = wdInflation * 100

  return (
    <div
      ref={popoverRef}
      id={popoverId}
      className="income-global-inflation-control__popover"
      role="dialog"
      aria-labelledby={titleId}
    >
      <div id={titleId} className="income-global-inflation-control__popover-title">
        Inflation adjustment
      </div>
      <div className="income-global-inflation-control__popover-value">+{pctDisplay.toFixed(2)}%</div>
      <div className="range-inline-row income-global-inflation-control__slider">
        <input
          type="range"
          min={0}
          max={6}
          step={0.25}
          value={pctDisplay}
          onChange={(e) => onWdInflation(Number(e.target.value) / 100)}
          aria-valuemin={0}
          aria-valuemax={6}
          aria-valuenow={pctDisplay}
          aria-label="Annual inflation uplift on withdrawal rates"
        />
        <div className="range-inline-ticks">
          <span className="range-inline-tick">0%</span>
          <span className="range-inline-tick range-inline-tick--end">6%</span>
        </div>
      </div>
      <p className="income-global-inflation-control__popover-hint">
        Annual withdrawal is modeled as balance × withdrawal rate × (1 + this adjustment). Applies to all
        WITHDRAW and BOTH strategies.
      </p>
    </div>
  )
}

/** Inline percent trigger with attached popover — used in income scenario guide copy. */
export function IncomeInflationPercentControl({ wdInflation, onWdInflation }: Props) {
  const [open, setOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverId = useId()
  const titleId = useId()
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(popoverRef, close, open, [triggerRef])

  const pctDisplay = wdInflation * 100

  return (
    <span className="income-global-inflation-control income-global-inflation-control--inline">
      <button
        ref={triggerRef}
        type="button"
        className="income-global-inflation-control__inline-percent"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={popoverId}
        aria-label={`Inflation adjustment ${pctDisplay.toFixed(1)} percent`}
        onClick={() => setOpen((prev) => !prev)}
      >
        {pctDisplay.toFixed(1)}%
      </button>
      {open ? (
        <InflationAdjustmentPopoverPanel
          popoverRef={popoverRef}
          wdInflation={wdInflation}
          onWdInflation={onWdInflation}
          popoverId={popoverId}
          titleId={titleId}
        />
      ) : null}
    </span>
  )
}
