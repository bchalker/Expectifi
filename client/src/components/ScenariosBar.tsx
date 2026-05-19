import { useAuth } from '../context/AuthContext'

type Props = {
  onOpenSignIn?: () => void
}

/** Guest-only prompt on the withdrawal-order row — signed-in users manage saves elsewhere. */
export function ScenariosBar({ onOpenSignIn }: Props) {
  const { apiReady, user, loading } = useAuth()

  if (loading || !apiReady || user) return null

  return (
    <button
      type="button"
      className="scenarios-bar-sign-in-pill"
      onClick={onOpenSignIn}
      aria-label="Sign in or create an account to save scenarios"
    >
      Sign in to Save
    </button>
  )
}
