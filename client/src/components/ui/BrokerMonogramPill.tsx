import type { BrokerSource } from '../../lib/brokerMonogram'
import { BROKER_MONOGRAM } from '../../lib/brokerMonogram'
import './BrokerMonogramPill.scss'

type Props = {
  source: BrokerSource
  /** When true, show Plaid "P" monogram + live-sync pulse (overrides broker initial). */
  plaidConnected?: boolean
  className?: string
}

/** Small square broker initial badge (CSV import menu, account rows, etc.). */
export function BrokerMonogramPill({ source, plaidConnected = false, className }: Props) {
  const displaySource = plaidConnected || source === 'plaid' ? 'plaid' : source
  const spec = BROKER_MONOGRAM[displaySource]
  const live = plaidConnected || source === 'plaid'

  return (
    <span
      className={[
        'broker-monogram-pill',
        live && 'broker-monogram-pill--plaid-live',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ background: spec.background }}
      aria-hidden
    >
      {spec.initial}
      {live ? <span className="broker-monogram-pill__live-dot" aria-hidden /> : null}
    </span>
  )
}
