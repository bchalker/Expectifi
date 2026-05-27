import type { ReactNode } from 'react'
import './StripSliderValuePin.scss'

type PinProps = {
  pct: string
  caption: string
  pctClassName?: string
}

/** Half-circle value callout: 72px circle cropped by a 36px slot, flat base on the track centerline. */
export function StripSliderValuePin({ pct, caption, pctClassName = '' }: PinProps) {
  return (
    <div className="strip-slider-value-pin-crop" aria-live="polite">
      <div className="strip-slider-value-pin">
        <span className={['strip-slider-value-pin__pct', pctClassName].filter(Boolean).join(' ')}>
          {pct}
        </span>
        <span className="strip-slider-value-pin__caption">{caption}</span>
      </div>
    </div>
  )
}

type RowProps = {
  pinPct: string
  pinCaption: string
  pinPctClassName?: string
  track: ReactNode
  ticks: ReactNode
}

/** Range row with min/center/max ticks and a value pin on the track centerline. */
export function RangeInlineWithValuePinRow({
  pinPct,
  pinCaption,
  pinPctClassName,
  track,
  ticks,
}: RowProps) {
  return (
    <div className="range-inline-row range-inline-row--with-value-pin">
      <div className="range-inline-track-pin-cell">
        <div className="range-inline-track-with-pin">
          <div className="range-inline-value-pin-slot">
            <StripSliderValuePin pct={pinPct} caption={pinCaption} pctClassName={pinPctClassName} />
          </div>
          {track}
        </div>
      </div>
      {ticks}
    </div>
  )
}
