import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, useOverlayState } from '@heroui/react'
import { IconCloudUpload } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { AppButton } from './ui/AppButton'
import './ConfigProfileTab.scss'

type Props = {
  onAccountCancelled?: () => void
  onOpenSignIn?: () => void
  onOpenRegister?: () => void
  onResetGuestProfile?: () => void
}

export function ConfigProfileTab({
  onAccountCancelled,
  onOpenSignIn,
  onOpenRegister,
  onResetGuestProfile,
}: Props) {
  const { user, cancelAccount, loading } = useAuth()
  const confirmState = useOverlayState()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [drawerShell, setDrawerShell] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!confirmState.isOpen) {
      setDrawerShell(null)
      return
    }
    setDrawerShell(document.getElementById('drawer'))
  }, [confirmState.isOpen])

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
    if (loading) return null

    return (
      <section className="config-profile-tab config-profile-tab--guest" aria-labelledby="config-profile-guest-heading">
        <div className="config-profile-tab__empty-icon-wrap" aria-hidden>
          <IconCloudUpload size={24} stroke={1.5} />
        </div>
        <h3 id="config-profile-guest-heading" className="config-profile-tab__empty-title">
          Your profile is saved in this browser
        </h3>
        <p className="config-profile-tab__empty-lead">
          Who you are, your goals, and Social Security settings persist here for free. Account balances are
          session-only until you create an account.
        </p>
        <ul className="config-profile-tab__empty-list">
          <li>Country, date of birth, income, and savings rate</li>
          <li>Social Security and retirement age goals</li>
          <li>Account balances (create an account to save permanently)</li>
        </ul>
        <div className="config-profile-tab__empty-actions">
          <AppButton
            type="button"
            size="sm"
            variant="primary"
            className="config-profile-tab__empty-cta"
            onPress={onOpenRegister}
          >
            Create account
          </AppButton>
          <button type="button" className="config-profile-tab__empty-signin" onClick={onOpenSignIn}>
            Already have an account? Sign in
          </button>
          {onResetGuestProfile ? (
            <button
              type="button"
              className="config-profile-tab__reset-profile"
              onClick={onResetGuestProfile}
            >
              Reset profile
            </button>
          ) : null}
        </div>
      </section>
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
        Cancel account ends your Stripe subscription immediately and permanently deletes your Expectifi account and
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

      {confirmState.isOpen && drawerShell
        ? createPortal(
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
                {err ? (
                  <p className="config-profile-tab__confirm-error" role="alert">
                    {err}
                  </p>
                ) : null}
                <div className="config-profile-tab__confirm-actions">
                  <button
                    type="button"
                    className="config-profile-tab__confirm-action config-profile-tab__confirm-action--muted"
                    disabled={busy}
                    onClick={() => confirmState.close()}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className="config-profile-tab__confirm-action config-profile-tab__confirm-action--danger"
                    disabled={busy}
                    onClick={() => void onConfirmCancel()}
                  >
                    {busy ? 'Cancelling…' : 'Yes, Cancel my account'}
                  </button>
                </div>
              </div>
            </div>,
            drawerShell,
          )
        : null}
    </section>
  )
}
