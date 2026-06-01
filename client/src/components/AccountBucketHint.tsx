import type { HintLinkAction, HintSegment } from '../hints/types'
import { renderHintTextWithBoldValues } from '../hints/renderHintText'
import './AccountBucketHint.scss'

export type AccountBucketHintProps = {
  segments: HintSegment[]
  onScenarioAction: (action: Extract<HintLinkAction, { type: 'scenario' }>) => void
  onSocialSecurityAction: () => void
  className?: string
}

export function AccountBucketHint({
  segments,
  onScenarioAction,
  onSocialSecurityAction,
  className,
}: AccountBucketHintProps) {
  const rootClass = ['portfolio-bucket-account-row__subtext', 'account-bucket-hint', className]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={rootClass}>
      {segments.map((segment, i) => {
        if (segment.type === 'value') {
          return (
            <strong key={i} className="account-bucket-hint__value">
              {segment.value}
            </strong>
          )
        }
        if (segment.type === 'text') {
          return (
            <span key={i}>{renderHintTextWithBoldValues(segment.value, `seg-${i}`)}</span>
          )
        }
        const onClick = () => {
          if (segment.action.type === 'scenario') {
            onScenarioAction(segment.action)
          } else {
            onSocialSecurityAction()
          }
        }
        return (
          <button
            key={i}
            type="button"
            className="account-bucket-hint__link"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClick()
            }}
          >
            {segment.label}
          </button>
        )
      })}
    </span>
  )
}
