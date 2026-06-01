import { createPortal } from 'react-dom'
import { IconSparkles, IconX } from '@tabler/icons-react'
import { AppButton } from './AppButton'
import './UpgradePrompt.scss'

type Props = {
  open: boolean
  onClose: () => void
  onUpgrade: () => void
  title?: string
  description?: string
  feature?: string
  className?: string
}

/** Pro upgrade gate for premium features (Plaid, etc.). */
export function UpgradePrompt({
  open,
  onClose,
  onUpgrade,
  title = 'Upgrade to Pro',
  description = 'Connect your brokerage accounts with live Plaid sync, keep CSV imports, and unlock the full portfolio toolkit.',
  feature = 'Plaid account linking',
  className,
}: Props) {
  if (!open) return null

  return createPortal(
    <div className="upgrade-prompt-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className={['upgrade-prompt', className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-prompt-title"
        aria-describedby="upgrade-prompt-desc"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="upgrade-prompt__close" aria-label="Close" onClick={onClose}>
          <IconX size={18} stroke={1.5} aria-hidden />
        </button>
        <div className="upgrade-prompt__icon-wrap" aria-hidden>
          <IconSparkles size={22} stroke={1.5} />
        </div>
        <h2 id="upgrade-prompt-title" className="upgrade-prompt__title">
          {title}
        </h2>
        <p id="upgrade-prompt-desc" className="upgrade-prompt__desc">
          {description}
        </p>
        <p className="upgrade-prompt__feature">
          <span className="upgrade-prompt__pro-pill">PRO</span>
          {feature}
        </p>
        <div className="upgrade-prompt__actions">
          <AppButton type="button" variant="ghost" size="sm" onPress={onClose}>
            Not now
          </AppButton>
          <AppButton type="button" variant="primary" size="sm" onPress={onUpgrade}>
            View Pro plans
          </AppButton>
        </div>
      </div>
    </div>,
    document.body,
  )
}
