import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayState } from '@heroui/react'
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

  const displayName = user.displayName?.trim() || user.email

  return (
    <section className="config-profile-tab" aria-labelledby="config-profile-heading">
      <div className="config-profile-tab__identity">
        <p id="config-profile-heading" className="config-profile-tab__name">
          {displayName}
        </p>
        <p className="config-profile-tab__email">{user.email}</p>
      </div>

      <div className="config-profile-tab__cancel-card">
        {err ? (
          <p className="config-profile-tab__error" role="alert">
            {err}
          </p>
        ) : null}
        <button
          type="button"
          className="config-profile-tab__cancel-btn"
          disabled={busy}
          onClick={() => {
            setErr(null)
            confirmState.open()
          }}
        >
          Cancel my Account
        </button>
        <p className="config-profile-tab__cancel-note">
          <strong>Note.</strong> Your privacy is the utmost concern. When you cancel your account, it ends your Stripe
          subscription, disconnects linked banks, permanently deletes your Expectifi account and all saved data on our
          servers, and clears plan data stored in this browser. This cannot be undone.
        </p>
      </div>

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
                  Your subscription will be cancelled, bank connections revoked, your account ({user.email}) and all
                  associated data on our servers will be permanently deleted, and local plan data in this browser will
                  be cleared. This cannot be undone.
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
