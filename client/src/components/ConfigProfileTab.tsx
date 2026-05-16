import { useCallback, useState } from 'react'
import { Button, useOverlayState } from '@heroui/react'
import { useAuth } from '../context/AuthContext'
import './ConfigProfileTab.scss'

type Props = {
  onAccountCancelled?: () => void
}

export function ConfigProfileTab({ onAccountCancelled }: Props) {
  const { user, cancelAccount } = useAuth()
  const confirmState = useOverlayState()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onConfirmCancel = useCallback(async () => {
    setErr(null)
    setBusy(true)
    const { error } = await cancelAccount()
    setBusy(false)
    if (error) {
      setErr(error)
      return
    }
    confirmState.close()
    onAccountCancelled?.()
  }, [cancelAccount, confirmState, onAccountCancelled])

  if (!user?.email) {
    return (
      <p className="footnote footnote--muted config-profile-tab__lead">
        Sign in to manage your account and subscription.
      </p>
    )
  }

  const displayLabel = user.displayName?.trim() || user.email

  return (
    <section className="config-profile-tab" aria-labelledby="config-profile-heading">
      <h3 id="config-profile-heading" className="config-profile-tab__heading">
        Profile
      </h3>
      <dl className="config-profile-tab__meta">
        <div className="config-profile-tab__meta-row">
          <dt className="config-profile-tab__meta-label">Name</dt>
          <dd className="config-profile-tab__meta-value">{displayLabel}</dd>
        </div>
        <div className="config-profile-tab__meta-row">
          <dt className="config-profile-tab__meta-label">Email</dt>
          <dd className="config-profile-tab__meta-value">{user.email}</dd>
        </div>
      </dl>
      <p className="footnote footnote--muted config-profile-tab__cancel-lead">
        Cancel account ends your Stripe subscription immediately and permanently deletes your HeadwayPlanner account and
        saved scenarios.
      </p>
      {err ? (
        <p className="config-profile-tab__error" role="alert">
          {err}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="config-profile-tab__cancel-btn"
        isDisabled={busy}
        onPress={() => {
          setErr(null)
          confirmState.open()
        }}
      >
        Cancel account
      </Button>

      {confirmState.isOpen ? (
        <div
          className="config-profile-tab__confirm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="config-profile-cancel-title"
          aria-describedby="config-profile-cancel-desc"
        >
          <button
            type="button"
            className="config-profile-tab__confirm-backdrop"
            aria-label="Dismiss"
            disabled={busy}
            onClick={() => confirmState.close()}
          />
          <div className="config-profile-tab__confirm-panel">
            <h4 id="config-profile-cancel-title" className="config-profile-tab__confirm-title">
              Cancel account?
            </h4>
            <p id="config-profile-cancel-desc" className="config-profile-tab__confirm-body">
              Your subscription will be cancelled in Stripe and your account ({user.email}) will be deleted. This
              cannot be undone.
            </p>
            <div className="config-profile-tab__confirm-footer">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="config-profile-tab__confirm-btn"
                isDisabled={busy}
                onPress={() => confirmState.close()}
              >
                Keep account
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                className="config-profile-tab__confirm-btn config-profile-tab__confirm-btn--danger"
                isDisabled={busy}
                onPress={() => void onConfirmCancel()}
              >
                {busy ? 'Cancelling…' : 'Yes, cancel account'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
