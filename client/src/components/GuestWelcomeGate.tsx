import type { PropsWithChildren } from 'react'

/** Renders the app; welcome overlay is handled inside App. */
export function GuestWelcomeGate({ children }: PropsWithChildren) {
  return <>{children}</>
}
