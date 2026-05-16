import { IconAdjustments, IconMenu2, IconX } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import type { DrawerName } from "../lib/computeResults";
import { APP_NAV_DRAWER_ITEMS } from "../lib/appNavDrawers";
import "./AppTopChrome.scss";

type Props = {
  targetRetirementAge: number;
  drawer: DrawerName | null;
  snapshotOpen: boolean;
  mobileNavOpen: boolean;
  onMobileNavToggle: () => void;
  onOpenDrawer: (name: DrawerName) => void;
  onSnapshotToggle: () => void;
  onOpenConfig: () => void;
  onOpenSignIn: () => void;
  onOpenRegister: () => void;
};

export function AppTopChrome({
  targetRetirementAge,
  drawer,
  snapshotOpen,
  mobileNavOpen,
  onMobileNavToggle,
  onOpenDrawer,
  onSnapshotToggle,
  onOpenConfig,
  onOpenSignIn,
  onOpenRegister,
}: Props) {
  const { apiReady, loading, user, googleCheckoutUi } = useAuth();
  /** Signed-in user, or Google+Stripe checkout identity before session is established. */
  const accountLabel = user
    ? user.displayName?.trim() || user.email
    : googleCheckoutUi
      ? googleCheckoutUi.displayName?.trim() || googleCheckoutUi.email
      : "";
  const showRetireByInProfile = Boolean(user?.onboardingDone);
  return (
    <header className="app-top-chrome">
      <div className="app-top-chrome__brand">
        <span className="app-top-chrome__mark">Eggspectifi</span>
        <span className="app-top-chrome__kicker">
          Hatch your retirement plan.
        </span>
      </div>

      <nav className="app-top-chrome__nav" aria-label="Panels and tools">
        <button
          id="app-top-chrome-snapshot-btn"
          type="button"
          className={`app-top-chrome__link${snapshotOpen ? " app-top-chrome__link--active" : ""}`}
          aria-expanded={snapshotOpen}
          aria-controls="strip-snapshot-panel"
          onClick={onSnapshotToggle}
        >
          Snapshot
        </button>
        {APP_NAV_DRAWER_ITEMS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`app-top-chrome__link${drawer === id ? " app-top-chrome__link--active" : ""}`}
            onClick={() => onOpenDrawer(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <button
        type="button"
        className="app-top-chrome__menu-btn"
        aria-label={mobileNavOpen ? "Close panels menu" : "Open panels menu"}
        aria-expanded={mobileNavOpen}
        aria-controls="app-left-nav-panel"
        onClick={onMobileNavToggle}
      >
        {mobileNavOpen ? (
          <IconX size={22} stroke={1.75} aria-hidden />
        ) : (
          <IconMenu2 size={22} stroke={1.75} aria-hidden />
        )}
      </button>

      <div className="app-top-chrome__tail">
        {!loading && user?.email ? (
          <button
            type="button"
            className={`app-top-chrome__account-group${drawer === "config" ? " app-top-chrome__account-group--active" : ""}`}
            aria-label="Open configure: planning, Social Security, and income presets"
            aria-expanded={drawer === "config"}
            aria-controls="drawer"
            onClick={onOpenConfig}
          >
            <span className="app-top-chrome__account-group__profile">
              {accountLabel ? (
                <span className="app-top-chrome__profile-name">{accountLabel}</span>
              ) : null}
              {showRetireByInProfile ? (
                <span
                  className="app-top-chrome__profile-ages"
                  aria-hidden
                >
                  Retire by {targetRetirementAge}
                </span>
              ) : null}
            </span>
            <span className="app-top-chrome__account-group__icons" aria-hidden>
              <IconAdjustments size={18} stroke={1.65} />
            </span>
          </button>
        ) : !loading ? (
          <>
            <div className="app-top-chrome__auth" aria-label="Account">
              {!apiReady ? (
                <span className="app-top-chrome__auth-offline" title="API not reachable">
                  Offline
                </span>
              ) : null}
              <button
                type="button"
                className="app-top-chrome__auth-link"
                onClick={onOpenSignIn}
              >
                Sign in
              </button>
              <button
                type="button"
                className="app-top-chrome__auth-cta"
                onClick={onOpenRegister}
              >
                Create account
              </button>
            </div>
            <button
              type="button"
              className={`app-top-chrome__settings${drawer === "config" ? " app-top-chrome__settings--active" : ""}`}
              aria-label="Configure: planning, Social Security, and income presets"
              aria-expanded={drawer === "config"}
              aria-controls="drawer"
              onClick={onOpenConfig}
            >
              <IconAdjustments size={18} stroke={1.65} aria-hidden />
            </button>
          </>
        ) : null}
      </div>
    </header>
  );
}
