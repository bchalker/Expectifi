import { IconAdjustments } from "@tabler/icons-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import {
  APP_NAV_DRAWER_ITEMS,
  APP_NAV_ROUTE_ITEMS,
  navItemUnavailableReason,
  navRequirementsMet,
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
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onOpenDrawer: (name: DrawerName) => void;
  onOpenConfig: () => void;
  onOpenSignIn: () => void;
  onOpenRegister: () => void;
  navContext: NavPanelContext;
  welcomeDone?: boolean;
  /** Upper area of the mobile nav sheet. */
  goalBar?: ReactNode;
};

export function AppLeftNav({
  targetRetirementAge: _targetRetirementAge,
  drawer,
  mobileOpen,
  onMobileOpenChange,
  onOpenDrawer,
  onOpenConfig,
  onOpenSignIn,
  onOpenRegister,
  navContext,
  welcomeDone = true,
  goalBar = null,
}: Props) {
  const { apiReady, loading, user, googleCheckoutUi } = useAuth();
  const { showSettings, slideIn } = useWelcomeSettingsReveal(welcomeDone);
  const accountLabel = user
    ? user.displayName?.trim() || user.email
    : googleCheckoutUi
      ? googleCheckoutUi.displayName?.trim() || googleCheckoutUi.email
      : "";
  const showViewMyPlansInProfile = Boolean(user?.onboardingDone);
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

  const routeNavItems = APP_NAV_ROUTE_ITEMS.flatMap(
    ({ id, path: routePath, label, requires }) => {
      const available = navRequirementsMet(requires, navContext);
      const unavailableReason = navItemUnavailableReason(requires, navContext);
      if (!available) return [];
      const isActive = path === routePath && available;
      return [
        {
          id,
          label,
          isActive,
          unavailableReason,
          onSelect: () => {
            navigateApp(routePath);
            closeMobile();
          },
        },
      ];
    },
  );
  const drawerNavItems = APP_NAV_DRAWER_ITEMS.flatMap(
    ({ id, label, requires }) => {
      const available = navRequirementsMet(requires, navContext);
      const unavailableReason = navItemUnavailableReason(requires, navContext);
      if (!available) return [];
      return [
        {
          id,
          label,
          isActive: drawer === id && available,
          unavailableReason,
          onSelect: () => openDrawer(id),
        },
      ];
    },
  );
  const hasPanelItems = routeNavItems.length > 0 || drawerNavItems.length > 0;
  const showGuestProfile = Boolean(accountLabel || showViewMyPlansInProfile);

  return (
    <>
      <button
        type="button"
        className={[
          "app-left-nav__backdrop",
          mobileOpen ? "app-left-nav__backdrop--open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        aria-label="Close menu"
        onClick={closeMobile}
      />
      <nav
        id="app-left-nav-panel"
        className={[
          "app-left-nav",
          mobileOpen ? "app-left-nav--mobile-open" : "",
          !hasPanelItems ? "app-left-nav--auth-only" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Panels and tools"
      >
        {goalBar ? <div className="app-left-nav__goal">{goalBar}</div> : null}
        {routeNavItems.length > 0 ? (
          <div className="app-left-nav__routes" aria-label="App pages">
            {routeNavItems.map(
              ({ id, label, isActive, unavailableReason, onSelect }) => (
                <button
                  key={id}
                  type="button"
                  className={[
                    "app-left-nav__route-link",
                    isActive ? "app-left-nav__route-link--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={isActive ? "page" : undefined}
                  title={unavailableReason ?? undefined}
                  onClick={onSelect}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        ) : null}
        {routeNavItems.length > 0 ? (
          <div className="app-left-nav__rule" aria-hidden="true" />
        ) : null}
        <div className="app-left-nav__scroll">
          {drawerNavItems.map(
            ({ id, label, isActive, unavailableReason, onSelect }) => (
              <button
                key={id}
                type="button"
                className={`app-left-nav__item${isActive ? " app-left-nav__item--active" : ""}`}
                title={unavailableReason ?? undefined}
                onClick={onSelect}
              >
                <span className="app-left-nav__item-label">{label}</span>
              </button>
            ),
          )}
        </div>
        <div className="app-left-nav__footer">
          {!loading && user?.email && showSettings ? (
            <button
              type="button"
              className={[
                "app-left-nav__account-group",
                drawer === "config"
                  ? "app-left-nav__account-group--active"
                  : "",
                slideIn ? "app-left-nav__account-group--slide-in" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label="View My Plans"
              aria-expanded={drawer === "config"}
              aria-controls="drawer"
              onClick={openConfig}
            >
              <span className="app-left-nav__account-group__profile">
                {accountLabel ? (
                  <span className="app-left-nav__profile-name">
                    {accountLabel}
                  </span>
                ) : null}
                {showViewMyPlansInProfile ? (
                  <span className="app-left-nav__profile-age">View My Plans</span>
                ) : null}
              </span>
            </button>
          ) : !loading ? (
            <>
              {showGuestProfile ? (
                <div className="app-left-nav__profile" aria-label="Profile">
                  {accountLabel ? (
                    <span className="app-left-nav__profile-name">
                      {accountLabel}
                    </span>
                  ) : null}
                  {showViewMyPlansInProfile ? (
                    <span
                      className="app-left-nav__profile-age"
                      aria-label="View My Plans"
                    >
                      View My Plans
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="app-left-nav__auth" aria-label="Account">
                {!apiReady ? (
                  <span
                    className="app-left-nav__auth-offline"
                    title="API not reachable"
                  >
                    Offline
                  </span>
                ) : null}
                <div className="app-left-nav__auth-toolbar">
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
                  {showSettings ? (
                    <button
                      type="button"
                      className={[
                        "app-left-nav__settings-btn",
                        drawer === "config"
                          ? "app-left-nav__settings-btn--active"
                          : "",
                        slideIn ? "app-left-nav__settings-btn--slide-in" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-label="Configure: planning and Social Security"
                      aria-expanded={drawer === "config"}
                      aria-controls="drawer"
                      onClick={openConfig}
                    >
                      <IconAdjustments size={18} stroke={1.65} aria-hidden />
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </nav>
    </>
  );
}
