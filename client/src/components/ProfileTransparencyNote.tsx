import { saveUserProfile } from '../lib/userProfileStorage'
import './ProfileTransparencyNote.scss'

type Props = {
  onDismiss: () => void
  onCreateAccount?: () => void
  className?: string
}

export function ProfileTransparencyNote({ onDismiss, onCreateAccount, className }: Props) {
  const dismiss = () => {
    saveUserProfile({ transparency_note_seen: true })
    onDismiss()
  }

  return (
    <div
      className={['profile-transparency-note', className].filter(Boolean).join(' ')}
      role="note"
    >
      <p className="profile-transparency-note__text">
        Your profile is saved in this browser. Account balances are session-only —{' '}
        {onCreateAccount ? (
          <button type="button" className="profile-transparency-note__link" onClick={onCreateAccount}>
            create a free account
          </button>
        ) : (
          'create a free account'
        )}{' '}
        to save everything permanently.
      </p>
      <button type="button" className="profile-transparency-note__dismiss" onClick={dismiss}>
        Got it
      </button>
    </div>
  )
}
