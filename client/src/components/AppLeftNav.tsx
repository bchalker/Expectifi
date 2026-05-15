import { IconAdjustments } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { APP_NAV_DRAWER_ITEMS } from "../lib/appNavDrawers";
import type { DrawerName } from "../lib/computeResults";
import "./AppLeftNav.scss";

const MOBILE_NAV_BODY_CLASS = "app-left-nav--mobile-open-body";

type Props = {
  currentAge: number;
  targetRetirementAge: number;
  profileDisplayName: string;
  drawer: DrawerName | null;
  snapshotOpen: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onOpenDrawer: (name: DrawerName) => void;
  onSnapshotToggle: () => void;
  onOpenConfig: () => void;
};

export function AppLeftNav({
  currentAge,
  targetRetirementAge,
  profileDisplayName,
  drawer,
  snapshotOpen,
  mobileOpen,
  onMobileOpenChange,
  onOpenDrawer,
  onSnapshotToggle,
  onOpenConfig,
}: Props) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 761px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const closeMobile = useCallback(
    () => onMobileOpenChange(false),
    [onMobileOpenChange],
  );

  const openDrawer = useCallback(
    (name: DrawerName) => {
      onOpenDrawer(name);
      closeMobile();
    },
    [onOpenDrawer, closeMobile],
  );

  const toggleSnapshot = useCallback(() => {
    onSnapshotToggle();
    closeMobile();
  }, [onSnapshotToggle, closeMobile]);

  const openConfig = useCallback(() => {
    onOpenConfig();
    closeMobile();
  }, [onOpenConfig, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, closeMobile]);

  useEffect(() => {
    if (mobileOpen) document.body.classList.add(MOBILE_NAV_BODY_CLASS);
    else document.body.classList.remove(MOBILE_NAV_BODY_CLASS);
    return () => document.body.classList.remove(MOBILE_NAV_BODY_CLASS);
  }, [mobileOpen]);

  if (isDesktop) return null;

  return (
    <>
      {mobileOpen ? (
        <div
          className="app-left-nav__backdrop"
          aria-hidden
          onClick={closeMobile}
        />
      ) : null}
      <nav
        id="app-left-nav-panel"
        className={`app-left-nav${mobileOpen ? " app-left-nav--mobile-open" : ""}`}
        aria-label="Panels and tools"
      >
        <div className="app-left-nav__scroll">
          <div className="app-left-nav__brand">
            <span className="app-left-nav__mark">Eggspectifi</span>
            <span className="app-left-nav__kicker">
              Hatch your retirement plan.
            </span>
          </div>
          <div
            className="app-left-nav__rule app-left-nav__rule--after-brand"
            aria-hidden
          />
          <button
            id="app-left-nav-snapshot-btn"
            type="button"
            className={`app-left-nav__item${snapshotOpen ? " app-left-nav__item--active" : ""}`}
            aria-expanded={snapshotOpen}
            aria-controls="strip-snapshot-panel"
            onClick={toggleSnapshot}
          >
            <span className="app-left-nav__item-label">Snapshot</span>
          </button>
          <div className="app-left-nav__rule" aria-hidden />
          {APP_NAV_DRAWER_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`app-left-nav__item${drawer === id ? " app-left-nav__item--active" : ""}`}
              onClick={() => openDrawer(id)}
            >
              <span className="app-left-nav__item-label">{label}</span>
            </button>
          ))}
        </div>
        <div className="app-left-nav__footer">
          <div className="app-left-nav__profile" aria-label="Profile">
            <span className="app-left-nav__profile-name">
              {profileDisplayName}
            </span>
            <span className="app-left-nav__profile-age">
              Age {currentAge} → {targetRetirementAge}
            </span>
          </div>
          <div className="app-left-nav__footer-actions">
            <button
              type="button"
              className="app-left-nav__settings-btn"
              aria-label="Configure: plan, retirement accounts, Fidelity import, brokerage return, and dividend yield presets"
              onClick={openConfig}
            >
              <IconAdjustments size={18} stroke={1.65} aria-hidden />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
