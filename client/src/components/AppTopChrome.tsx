import { IconAdjustments, IconMenu2, IconX } from "@tabler/icons-react";
import type { DrawerName } from "../lib/computeResults";
import { APP_NAV_DRAWER_ITEMS } from "../lib/appNavDrawers";
import "./AppTopChrome.scss";

type Props = {
  currentAge: number;
  targetRetirementAge: number;
  profileDisplayName: string;
  drawer: DrawerName | null;
  snapshotOpen: boolean;
  mobileNavOpen: boolean;
  onMobileNavToggle: () => void;
  onOpenDrawer: (name: DrawerName) => void;
  onSnapshotToggle: () => void;
  onOpenConfig: () => void;
};

export function AppTopChrome({
  currentAge,
  targetRetirementAge,
  profileDisplayName,
  drawer,
  snapshotOpen,
  mobileNavOpen,
  onMobileNavToggle,
  onOpenDrawer,
  onSnapshotToggle,
  onOpenConfig,
}: Props) {
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
        <div className="app-top-chrome__profile" aria-label="Profile">
          <span className="app-top-chrome__profile-name">
            {profileDisplayName}
          </span>
          <span
            className="app-top-chrome__profile-ages"
            aria-label="Current age to retirement age"
          >
            {currentAge} → {targetRetirementAge}
          </span>
        </div>
        <button
          type="button"
          className="app-top-chrome__settings"
          aria-label="Configure: plan, retirement accounts, Fidelity import, brokerage return, and dividend yield presets"
          onClick={onOpenConfig}
        >
          <IconAdjustments size={20} stroke={1.65} aria-hidden />
        </button>
      </div>
    </header>
  );
}
