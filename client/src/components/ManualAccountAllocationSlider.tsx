import { IconArrowNarrowRightDashed } from '@tabler/icons-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useClickOutside } from '../hooks/useClickOutside'
import {
  ALLOCATION_PROFILE_SLIDER_MAX,
  ALLOCATION_PROFILE_SLIDER_MIN,
  allocationProfileDisplayAtEquityPct,
  allocationProfileDisplayAtPosition,
  allocationProfileForEquityPct,
  clampAllocationSliderPosition,
  interpolatedEquityPct,
  resolveAllocationSliderState,
  type AllocationProfile,
} from '../lib/allocationProfile'
import './ManualAccountAllocationSlider.scss'

type Props = {
  entryId: string
  value: AllocationProfile | null | undefined
  equityPct?: number | null
  onChange: (profile: AllocationProfile, equityPct: number) => void
  className?: string
}

/** Fine-grained track between conservative (0) and all-equities (3). */
const ALLOCATION_SLIDER_STEP = 0.05

const ALLOCATION_POPOVER_DESCRIPTION =
  'The further right you go, the higher the ceiling and the lower the floor. Scenario return ranges are built from this mix.'

function AllocationSliderPanel({
  stop,
  onPositionPreview,
  onStopChange,
}: {
  stop: number
  onPositionPreview: (position: number) => void
  onStopChange: (stop: number) => void
}) {
  const [draftPosition, setDraftPosition] = useState(stop)
  const display = allocationProfileDisplayAtPosition(draftPosition)

  useEffect(() => {
    setDraftPosition(stop)
    onPositionPreview(stop)
  }, [stop, onPositionPreview])

  const commitPosition = useCallback(
    (position: number) => {
      const clamped = clampAllocationSliderPosition(position)
      setDraftPosition(clamped)
      onPositionPreview(clamped)
      onStopChange(clamped)
    },
    [onPositionPreview, onStopChange],
  )

  const previewPosition = useCallback(
    (position: number) => {
      const clamped = clampAllocationSliderPosition(position)
      setDraftPosition(clamped)
      onPositionPreview(clamped)
    },
    [onPositionPreview],
  )

  return (
    <div className="manual-account-allocation-slider-panel">
      <div className="range-inline-row manual-account-allocation-slider-panel__track-row">
        <div className="range-inline-track-wrap manual-account-allocation-slider-panel__track-wrap">
          <input
            type="range"
            className="manual-account-allocation-slider-panel__range"
            min={ALLOCATION_PROFILE_SLIDER_MIN}
            max={ALLOCATION_PROFILE_SLIDER_MAX}
            step={ALLOCATION_SLIDER_STEP}
            value={draftPosition}
            aria-label="Investment mix"
            aria-valuemin={ALLOCATION_PROFILE_SLIDER_MIN}
            aria-valuemax={ALLOCATION_PROFILE_SLIDER_MAX}
            aria-valuenow={draftPosition}
            aria-valuetext={`${display.label}, ${display.mixHint}`}
            onInput={(e) => {
              const next = Number(e.currentTarget.value)
              if (!Number.isFinite(next)) return
              previewPosition(next)
            }}
            onPointerUp={(e) => {
              const next = Number(e.currentTarget.value)
              if (!Number.isFinite(next)) return
              commitPosition(next)
            }}
            onKeyUp={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') {
                return
              }
              const next = Number(e.currentTarget.value)
              if (!Number.isFinite(next)) return
              commitPosition(next)
            }}
          />
        </div>
        <div className="range-inline-ticks">
          <span className="range-inline-tick">Conservative</span>
          <span className="range-inline-tick range-inline-tick--end">Aggressive</span>
        </div>
      </div>
    </div>
  )
}

/** Row control: compact trigger opens portaled popover with continuous mix slider. */
export function ManualAccountAllocationSlider({
  entryId,
  value,
  equityPct,
  onChange,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const savedState = resolveAllocationSliderState(value, equityPct)
  const [draftStop, setDraftStop] = useState(savedState.position)
  const [previewPosition, setPreviewPosition] = useState(savedState.position)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({})

  const commitPosition = useCallback(
    (position: number) => {
      const clamped = clampAllocationSliderPosition(position)
      const nextEquityPct = interpolatedEquityPct(clamped)
      const profile = allocationProfileForEquityPct(nextEquityPct)
      setDraftStop(clamped)
      setPreviewPosition(clamped)
      onChange(profile, nextEquityPct)
    },
    [onChange],
  )

  const acceptAndClose = useCallback(() => {
    commitPosition(previewPosition)
    setOpen(false)
  }, [commitPosition, previewPosition])

  useClickOutside(popoverRef, acceptAndClose, open, [triggerRef, rootRef])

  const closedDisplay = allocationProfileDisplayAtEquityPct(savedState.equityPct)
  const liveDisplay = open
    ? allocationProfileDisplayAtPosition(previewPosition)
    : closedDisplay

  useEffect(() => {
    if (!open) {
      setDraftStop(savedState.position)
      setPreviewPosition(savedState.position)
    }
  }, [open, savedState.equityPct, savedState.position])

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const popoverWidth = popoverRef.current?.offsetWidth ?? 20 * 16
    const arrowInset = 12
    const triggerCenter = rect.left + rect.width / 2
    let popoverLeft = rect.left
    let arrowLeft = triggerCenter - popoverLeft
    if (arrowLeft < arrowInset) {
      popoverLeft -= arrowInset - arrowLeft
      arrowLeft = arrowInset
    } else if (arrowLeft > popoverWidth - arrowInset) {
      popoverLeft -= arrowLeft - (popoverWidth - arrowInset)
      arrowLeft = popoverWidth - arrowInset
    }
    setPopoverStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: popoverLeft,
      zIndex: 1200,
      '--allocation-popover-arrow-left': `${arrowLeft}px`,
    } as CSSProperties)
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePopoverPosition()
    const raf = requestAnimationFrame(updatePopoverPosition)
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [open, updatePopoverPosition, liveDisplay.label, liveDisplay.mixHint])

  const rootClass = ['manual-account-allocation', className].filter(Boolean).join(' ')

  const popover =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            className="manual-account-allocation__popover"
            style={popoverStyle}
            role="dialog"
            aria-label={ALLOCATION_POPOVER_DESCRIPTION}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="manual-account-allocation__popover-arrow" aria-hidden />
            <p className="manual-account-allocation__popover-desc">{ALLOCATION_POPOVER_DESCRIPTION}</p>
            <AllocationSliderPanel
              stop={draftStop}
              onPositionPreview={setPreviewPosition}
              onStopChange={commitPosition}
            />
          </div>,
          document.body,
        )
      : null

  const triggerAriaLabel = `${liveDisplay.label}, ${liveDisplay.mixHint}`

  return (
    <div
      ref={rootRef}
      className={rootClass}
      data-allocation-entry={entryId}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="manual-account-allocation__row">
        <span className="manual-account-allocation__field-label" id={`${entryId}-allocation-label`}>
          Investments
        </span>
        <span className="manual-account-allocation__lead-icon" aria-hidden>
          <IconArrowNarrowRightDashed size={14} stroke={1.15} />
        </span>
        <button
          ref={triggerRef}
          type="button"
          className="manual-account-allocation__trigger"
          data-allocation-tone={liveDisplay.tone}
          aria-labelledby={`${entryId}-allocation-label`}
          aria-label={triggerAriaLabel}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (open) {
              acceptAndClose()
            } else {
              setOpen(true)
            }
          }}
        >
          {open ? (
            <span className="manual-account-allocation__trigger-dot" aria-hidden />
          ) : null}
          <span className="manual-account-allocation__trigger-label">{liveDisplay.label}</span>
          <span className="manual-account-allocation__trigger-mix">
            {' '}- {liveDisplay.mixHint}
          </span>
        </button>
      </div>
      {popover}
    </div>
  )
}
