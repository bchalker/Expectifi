import { IconAdjustments } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  APP_NAV_DRAWER_ITEMS,
  APP_NAV_ROUTE_ITEMS,
  isSnapshotNavAvailable,
  navItemUnavailableReason,
  navRequirementsMet,
  SNAPSHOT_NAV_REQUIRES,
  type NavPanelContext,
} from "../lib/appNavDrawers";
import { useAppPath } from "../hooks/useAppPath";
import { useWelcomeSettingsReveal } from "../hooks/useWelcomeSettingsReveal";
import { navigateApp } from "../lib/appPaths";
import type { DrawerName } from "../lib/computeResults";
import "./AppLeftNav.scss";

const MOBILE_NAV_BODY_CLASS = "app-left-nav--mobile-open-body";
const DESKTOP_NAV_MQ = "(min-width: 761px)";

function readIsDesktopNav(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(DESKTOP_NAV_MQ).matches;
}

type Props = {
  targetRetirementAge: number;
  drawer: DrawerName | null;
  snapshotOpen: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onOpenDrawer: (name: DrawerName) => void;
  onSnapshotToggle: () => void;
  onOpenConfig: () => void;
  onOpenSignIn: () => void;
  onOpenRegister: () => void;
  navContext: NavPanelContext;
  welcomeDone?: boolean;
};

export function AppLeftNav({
  targetRetirementAge,
  drawer,
  snapshotOpen,
  mobileOpen,
  onMobileOpenChange,
  onOpenDrawer,
  onSnapshotToggle,
  onOpenConfig,
  onOpenSignIn,
  onOpenRegister,
  navContext,
  welcomeDone = true,
}: Props) {
  const snapshotAvailable = isSnapshotNavAvailable(navContext);
  const snapshotUnavailableReason = navItemUnavailableReason(SNAPSHOT_NAV_REQUIRES, navContext);
  const { apiReady, loading, user, googleCheckoutUi } = useAuth();
  const { showSettings, slideIn } = useWelcomeSettingsReveal(welcomeDone);
  const accountLabel = user
    ? user.displayName?.trim() || user.email
    : googleCheckoutUi
      ? googleCheckoutUi.displayName?.trim() || googleCheckoutUi.email
      : "";
  const showRetireByInProfile = Boolean(user?.onboardingDone);
  const path = useAppPath();
  const [isDesktop, setIsDesktop] = useState(readIsDesktopNav);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(DESKTOP_NAV_MQ);
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
            <span className="app-left-nav__mark">Expectifi</span>
          </div>
          <div
            className="app-left-nav__rule app-left-nav__rule--after-brand"
            aria-hidden
          />
          <button
            id="app-left-nav-snapshot-btn"
            type="button"
            className={`app-left-nav__item${snapshotOpen && snapshotAvailable ? " app-left-nav__item--active" : ""}${!snapshotAvailable ? " app-left-nav__item--unavailable" : ""}`}
            aria-expanded={snapshotOpen && snapshotAvailable}
            aria-controls="strip-snapshot-panel"
            aria-disabled={!snapshotAvailable}
            title={snapshotUnavailableReason ?? undefined}
            onClick={() => {
              if (!snapshotAvailable) return;
              toggleSnapshot();
            }}
          >
            <span className="app-left-nav__item-label">Snapshot</span>
          </button>
          <div className="app-left-nav__rule" aria-hidden />
          {APP_NAV_ROUTE_ITEMS.map(({ id, path: routePath, label, requires }) => {
            const available = navRequirementsMet(requires, navContext);
            const unavailableReason = navItemUnavailableReason(requires, navContext);
            const isActive = path === routePath && available;
            return (
              <button
                key={id}
                type="button"
                className={`app-left-nav__item${isActive ? " app-left-nav__item--active" : ""}${!available ? " app-left-nav__item--unavailable" : ""}`}
                aria-current={isActive ? "page" : undefined}
                aria-disabled={!available}
                title={unavailableReason ?? undefined}
                onClick={() => {
                  if (!available) return;
                  navigateApp(routePath);
                  closeMobile();
                }}
              >
                <span className="app-left-nav__item-label">{label}</span>
              </button>
            );
          })}
          {APP_NAV_DRAWER_ITEMS.map(({ id, label, requires }) => {
            const available = navRequirementsMet(requires, navContext);
            const unavailableReason = navItemUnavailableReason(requires, navContext);
            return (
              <button
                key={id}
                type="button"
                className={`app-left-nav__item${drawer === id && available ? " app-left-nav__item--active" : ""}${!available ? " app-left-nav__item--unavailable" : ""}`}
                aria-disabled={!available}
                title={unavailableReason ?? undefined}
                onClick={() => {
                  if (!available) return;
                  openDrawer(id);
                }}
              >
                <span className="app-left-nav__item-label">{label}</span>
              </button>
            );
          })}
        </div>
        <div className="app-left-nav__footer">
          {!loading && user?.email && showSettings ? (
            <button
              type="button"
              className={[
                "app-left-nav__account-group",
                drawer === "config" ? "app-left-nav__account-group--active" : "",
                slideIn ? "app-left-nav__account-group--slide-in" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label="Open configure: planning, Social Security, and income presets"
              aria-expanded={drawer === "config"}
              aria-controls="drawer"
              onClick={openConfig}
            >
              <span className="app-left-nav__account-group__profile">
                {accountLabel ? (
                  <span className="app-left-nav__profile-name">{accountLabel}</span>
                ) : null}
                {showRetireByInProfile ? (
                  <span className="app-left-nav__profile-age" aria-hidden>
                    Retire by {targetRetirementAge}
                  </span>
                ) : null}
              </span>
              <span className="app-left-nav__account-group__icons" aria-hidden>
                <IconAdjustments size={18} stroke={1.65} />
              </span>
            </button>
          ) : !loading ? (
            <>
              <div className="app-left-nav__profile" aria-label="Profile">
                {accountLabel ? (
                  <span className="app-left-nav__profile-name">{accountLabel}</span>
                ) : null}
                {showRetireByInProfile ? (
                  <span className="app-left-nav__profile-age" aria-label={`Retire by age ${targetRetirementAge}`}>
                    Retire by {targetRetirementAge}
                  </span>
                ) : null}
              </div>
              <div className="app-left-nav__auth" aria-label="Account">
                {!apiReady ? (
                  <span
                    className="app-left-nav__auth-offline"
                    title="API not reachable"
                  >
                    Offline
                  </span>
                ) : null}
                <div className="app-left-nav__auth-row">
                  <button
                    type="button"
                    className="app-left-nav__auth-link"
                    onClick={onOpenSignIn}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    className="app-left-nav__auth-cta"
                    onClick={onOpenRegister}
                  >
                    Create account
                  </button>
                </div>
              </div>
              {showSettings ? (
                <div className="app-left-nav__footer-actions">
                  <button
                    type="button"
                    className={[
                      "app-left-nav__settings-btn",
                      drawer === "config" ? "app-left-nav__settings-btn--active" : "",
                      slideIn ? "app-left-nav__settings-btn--slide-in" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label="Configure: planning, Social Security, and income presets"
                    aria-expanded={drawer === "config"}
                    aria-controls="drawer"
                    onClick={openConfig}
                  >
                    <IconAdjustments size={18} stroke={1.65} aria-hidden />
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </nav>
    </>
  );
}
