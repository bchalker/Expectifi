import { Header } from './Header'
import type { DrawerName } from '../lib/computeResults'
import type { NavPanelContext } from '../lib/appNavDrawers'

type Props = {
  targetRetirementAge: number
  drawer: DrawerName | null
  mobileNavOpen: boolean
  onMobileNavToggle: () => void
  onOpenDrawer: (name: DrawerName) => void
  onOpenConfig: () => void
  onOpenSignIn: () => void
  onOpenRegister: () => void
  navContext: NavPanelContext
}

/** @deprecated Use `Header` with `variant="app"` directly. */
export function AppTopChrome({
  onOpenSignIn,
  onOpenRegister,
  ...props
}: Props) {
  return <Header variant="app" {...props} onSignIn={onOpenSignIn} onCreateAccount={onOpenRegister} />
}
