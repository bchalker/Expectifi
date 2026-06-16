import type { ReactNode } from 'react'
import './LabelWithHelperPill.scss'

type Props = {
  label: ReactNode
  helper?: ReactNode
  /** Default = bottom helper, matching where-to-retire headers. */
  helperPlacement?: 'above' | 'below'
  trail?: ReactNode
  className?: string
}

export function LabelWithHelperPill({
  label,
  helper,
  helperPlacement = 'below',
  trail,
  className = '',
}: Props) {
  return (
    <div
      className={[
        'label-with-helper-pill',
        helperPlacement === 'above' && 'label-with-helper-pill--helper-above',
        helperPlacement === 'below' && 'label-with-helper-pill--helper-below',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={helper ? `${String(label)}. ${String(helper)}` : String(label)}
    >
      {helper && helperPlacement === 'above' ? (
        <p className="label-with-helper-pill__helper">{helper}</p>
      ) : null}
      <p className="label-with-helper-pill__label-row">
        <span className="label-with-helper-pill__label">{label}</span>
        {trail ? <span className="label-with-helper-pill__trail">{trail}</span> : null}
      </p>
      {helper && helperPlacement === 'below' ? (
        <p className="label-with-helper-pill__helper">{helper}</p>
      ) : null}
    </div>
  )
}

