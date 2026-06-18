import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconChevronDown,
  IconLink,
  IconPencil,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { AppOverlayScrollbars } from "./ui/AppOverlayScrollbars";
import { useAuth } from "../context/AuthContext";
import { usePlan } from "../hooks/usePlan";
import {
  CSV_CUSTODIAN_OPTIONS,
  isPositionsCsvCustodian,
  type PositionsCsvCustodian,
} from "../lib/positionsCsvImport";
import type { PlaidItemSummary } from "../lib/api/plaid";
import { AppButton } from "./ui/AppButton";
import { UpgradePrompt } from "./ui/UpgradePrompt";
import { Tooltip } from "./Tooltip";
import {
  PlaidConnectionContext,
  PlaidDisconnectButton,
  formatPlaidSyncTime,
} from "./PlaidConnectionHeader";
import "./HoldingScenarioPopout.scss";
import "./SidePanelShell.scss";
import "./AccountBalancesManageMenu.scss";

const MANAGE_SUBLABEL = "Manage";

export type ManageOverlayPhase = "method" | "manual" | "csv";

export type ManageOverlayPhaseHeader = {
  title: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
};
const MANAGE_VALUE_LABEL = "Accounts";

const CSV_IMPORT_OPTIONS = CSV_CUSTODIAN_OPTIONS.filter(
  (o) => o.id !== "other" && o.id !== "webull",
);

const CSV_EXPORT_HINTS: Partial<Record<PositionsCsvCustodian, string>> = {
  fidelity: "Export from Accounts & Trade",
  schwab: "Export from Positions",
  vanguard: "Export from My Accounts",
};

function latestHealthySyncTime(items: PlaidItemSummary[]): string | null {
  const healthy = items.filter((i) => i.status === "healthy");
  if (!healthy.length) return null;
  let latest = healthy[0]!.lastSyncedAt;
  for (const item of healthy) {
    if (new Date(item.lastSyncedAt).getTime() > new Date(latest).getTime()) {
      latest = item.lastSyncedAt;
    }
  }
  return latest;
}

type PlaidConnectionsSectionProps = {
  items: PlaidItemSummary[];
  linkBusy: boolean;
  onReconnect: (itemId: string) => void;
  onDisconnect: (itemId: string) => void | Promise<void>;
  showConnectAnother?: boolean;
  onConnectAnother?: () => void;
  connectAnotherLabel?: string;
};

function PlaidConnectionsSection({
  items,
  linkBusy,
  onReconnect,
  onDisconnect,
}: PlaidConnectionsSectionProps) {
  if (!items.length) return null;
  return (
    <div
      className="account-balances-manage__plaid-section"
      aria-label="Connected Plaid accounts"
    >
      <ul className="plaid-connection-panel__list">
        {items.map((item) => {
          const healthy = item.status === "healthy";
          return (
            <li
              key={item.id}
              className={`plaid-connection-panel__row${healthy ? " plaid-connection-panel__row--synced" : ""}`}
            >
              <div className="plaid-connection-panel__institution">
                <div className="plaid-connection-panel__institution-text">
                  {healthy ? (
                    <span className="plaid-connection-panel__name-row">
                      <span className="plaid-connection-panel__name">
                        {item.institutionName}
                      </span>
                      <span
                        className="plaid-connection-panel__sync-dot"
                        aria-hidden
                      />
                    </span>
                  ) : (
                    <span className="plaid-connection-panel__name">
                      {item.institutionName}
                    </span>
                  )}
                  <span className="plaid-connection-panel__synced">
                    Last synced {formatPlaidSyncTime(item.lastSyncedAt)}
                  </span>
                </div>
              </div>
              {!healthy ? (
                <div className="plaid-connection-panel__status">
                  <span className="plaid-connection-panel__status-pill plaid-connection-panel__status-pill--warn">
                    <IconAlertTriangle size={14} stroke={1.5} aria-hidden />
                    Reconnect needed
                  </span>
                </div>
              ) : null}
              <div className="plaid-connection-panel__actions">
                {!healthy ? (
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="plaid-connection-panel__reconnect"
                    isDisabled={linkBusy}
                    onPress={() => onReconnect(item.id)}
                  >
                    Reconnect
                  </AppButton>
                ) : null}
                <PlaidDisconnectButton
                  item={item}
                  disabled={linkBusy}
                  onConfirm={() => void onDisconnect(item.id)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type AccountBalancesManageMenuProps = {
  canClearAccounts: boolean;
  onManualAdd: () => void;
  onPickCsvCustodian: (custodian: PositionsCsvCustodian) => void;
  /** Internal navigation within the add-accounts overlay. */
  overlayPhase?: ManageOverlayPhase;
  /** Phase still mounted while collapsing back to the method selector. */
  exitingOverlayPhase?: Exclude<ManageOverlayPhase, "method"> | null;
  /** Title/subtitle for manual and CSV phases in the shared shell header. */
  phaseHeader?: ManageOverlayPhaseHeader | null;
  onBackToMethod?: () => void;
  manualPanel?: ReactNode | null;
  csvPanel?: ReactNode | null;
  /** True while a CSV file is staged/parsing before the csv phase is shown. */
  csvIngestActive?: boolean;
  /** Hidden file input rendered inside the overlay portal for broker CSV picks. */
  csvFileInput?: ReactNode | null;
  onClearAccounts: () => void;
  onImportApplied?: () => void;
  /** Shown above connect actions when manual balances would be replaced. */
  manualReplaceNotice?: string | null;
  /** Gate CSV import / Plaid before replacing manual amounts. */
  onRequestReplaceManual?: (proceed: () => void) => void;
  /** Gate manual entry before replacing imported / linked data. */
  onRequestReplaceImport?: (proceed: () => void) => void;
  className?: string;
  /** Increment to open the Manage menu programmatically. */
  openRequest?: number;
  /** Increment to close the Manage menu programmatically. */
  closeRequest?: number;
  /** Hide the header trigger; use with `initialOpen` for empty-state auto-open. */
  hideTrigger?: boolean;
  /** Open the overlay on first mount (empty portfolio). */
  initialOpen?: boolean;
  /**
   * Empty portfolio: financial entry is required — hide dismiss controls
   * (not used when opened from the header Manage Financials trigger).
   */
  requiredEntry?: boolean;
  /** Post-onboarding add accounts — Expectifi header, cancel returns to landing. */
  postOnboardingImport?: boolean;
  onPostOnboardingCancel?: () => void;
  /** Opens Pro checkout / register flow from upgrade prompt. */
  onOpenUpgrade?: () => void;
  /** Nested confirm (e.g. remove all accounts) rendered above the menu panel. */
  stackedOverlay?: ReactNode | null;
  /** When true, Escape closes the stacked overlay first. */
  removeConfirmOpen?: boolean;
  onRemoveConfirmClose?: () => void;
  replaceConfirmOpen?: boolean;
  onReplaceConfirmClose?: () => void;
  onManageOpenChange?: (open: boolean) => void;
};

export function AccountBalancesManageMenu({
  canClearAccounts,
  onManualAdd,
  onPickCsvCustodian,
  onClearAccounts,
  onImportApplied,
  manualReplaceNotice = null,
  onRequestReplaceManual,
  onRequestReplaceImport,
  className,
  openRequest,
  closeRequest,
  hideTrigger = false,
  initialOpen = false,
  requiredEntry = false,
  postOnboardingImport = false,
  onPostOnboardingCancel,
  onOpenUpgrade,
  stackedOverlay = null,
  removeConfirmOpen = false,
  onRemoveConfirmClose,
  replaceConfirmOpen = false,
  onReplaceConfirmClose,
  onManageOpenChange,
  overlayPhase = "method",
  exitingOverlayPhase = null,
  phaseHeader = null,
  onBackToMethod,
  manualPanel = null,
  csvPanel = null,
  csvIngestActive = false,
  csvFileInput = null,
}: AccountBalancesManageMenuProps) {
  const { user } = useAuth();
  const { hasPaidSubscription } = usePlan();
  const ctx = useContext(PlaidConnectionContext);
  const showPlanBadges = !user;

  const [open, setOpen] = useState(initialOpen);
  const [closing, setClosing] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const phaseTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [displayPhase, setDisplayPhase] =
    useState<ManageOverlayPhase>(overlayPhase);

  const items = ctx?.items ?? [];
  const hasConnections = items.length > 0;
  const healthyItems = useMemo(
    () => items.filter((i) => i.status === "healthy"),
    [items],
  );
  const hasHealthyPlaid = healthyItems.length > 0;
  const lastHealthySync = latestHealthySyncTime(items);
  const plaidConfigured = ctx?.configured !== false;
  const showPlaidConnect = hasPaidSubscription && plaidConfigured;

  const completeClose = useCallback(() => {
    setClosing(false);
    setOpen(false);
    ctx?.setPanelOpen(false);
  }, [ctx]);

  const close = useCallback(() => {
    if (!open || closing) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      completeClose();
      return;
    }
    setClosing(true);
  }, [closing, completeClose, open]);

  const dismiss = useCallback(() => {
    if (requiredEntry && !postOnboardingImport) return;
    close();
  }, [close, postOnboardingImport, requiredEntry]);

  const handlePostOnboardingCancel = useCallback(() => {
    if (!postOnboardingImport || closing) return;
    completeClose();
    onPostOnboardingCancel?.();
  }, [
    closing,
    completeClose,
    onPostOnboardingCancel,
    postOnboardingImport,
  ]);

  const openMenu = useCallback(() => {
    setClosing(false);
    setOpen(true);
    ctx?.setPanelOpen(true);
  }, [ctx]);

  const toggleMenu = useCallback(() => {
    if (open) dismiss();
    else openMenu();
  }, [dismiss, open, openMenu]);

  useEffect(() => {
    if (!initialOpen) return;
    ctx?.setPanelOpen(true);
  }, [ctx, initialOpen]);

  const prevOpenRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevOpenRef.current === open) return;
    prevOpenRef.current = open;
    onManageOpenChange?.(open);
  }, [open, onManageOpenChange]);

  const lastOpenRequestRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!openRequest || lastOpenRequestRef.current === openRequest) return;
    lastOpenRequestRef.current = openRequest;
    openMenu();
  }, [openRequest, openMenu]);

  const lastCloseRequestRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!closeRequest || lastCloseRequestRef.current === closeRequest) return;
    lastCloseRequestRef.current = closeRequest;
    if (open && !closing) close();
  }, [closeRequest, close, closing, open]);

  useEffect(() => {
    if (!open) {
      setDisplayPhase(overlayPhase);
      return;
    }
    if (overlayPhase === displayPhase) return;
    if (phaseTransitionTimerRef.current) {
      clearTimeout(phaseTransitionTimerRef.current);
    }
    phaseTransitionTimerRef.current = setTimeout(() => {
      setDisplayPhase(overlayPhase);
      phaseTransitionTimerRef.current = null;
    }, 200);
    return () => {
      if (phaseTransitionTimerRef.current) {
        clearTimeout(phaseTransitionTimerRef.current);
        phaseTransitionTimerRef.current = null;
      }
    };
  }, [displayPhase, open, overlayPhase]);

  useEffect(() => {
    if (overlayPhase !== "manual" && overlayPhase !== "csv") return;
    const viewport = menuRef.current?.querySelector(
      ".account-balances-manage__phase-scroll [data-overlayscrollbars-viewport]",
    );
    (viewport as HTMLElement | null)?.scrollTo({ top: 0 });
  }, [overlayPhase]);

  useEffect(() => {
    if (!open || closing || requiredEntry) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (removeConfirmOpen) {
        onRemoveConfirmClose?.();
        return;
      }
      if (replaceConfirmOpen) {
        onReplaceConfirmClose?.();
        return;
      }
      dismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [
    dismiss,
    closing,
    open,
    requiredEntry,
    removeConfirmOpen,
    onRemoveConfirmClose,
    replaceConfirmOpen,
    onReplaceConfirmClose,
  ]);

  const handleBackdropAnimationEnd = useCallback(
    (e: AnimationEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.animationName !== "account-balances-manage-backdrop-out") return;
      if (!closing) return;
      completeClose();
    },
    [closing, completeClose],
  );

  const handleBackdropMouseDown = useCallback(
    (e: MouseEvent) => {
      if (requiredEntry) return;
      if (removeConfirmOpen || replaceConfirmOpen) return;
      if ((e.target as HTMLElement).closest?.(".plaid-disconnect-popover"))
        return;
      if ((e.target as HTMLElement).closest?.(".account-balances-remove-overlay"))
        return;
      dismiss();
    },
    [dismiss, requiredEntry, removeConfirmOpen, replaceConfirmOpen],
  );

  const handlePlaidConnect = useCallback(() => {
    if (!hasPaidSubscription) {
      if (!requiredEntry) close();
      setUpgradeOpen(true);
      return;
    }
    if (!showPlaidConnect || ctx?.linkBusy) return;
    const run = () => {
      close();
      if (ctx) {
        void ctx.startAddAccount();
        return;
      }
      onImportApplied?.();
    };
    if (onRequestReplaceManual) {
      onRequestReplaceManual(run);
      return;
    }
    run();
  }, [
    close,
    ctx,
    hasPaidSubscription,
    onImportApplied,
    onRequestReplaceManual,
    requiredEntry,
    showPlaidConnect,
  ]);

  const handleCsvPick = useCallback(
    (custodian: PositionsCsvCustodian) => {
      if (!isPositionsCsvCustodian(custodian)) return;
      const run = () => onPickCsvCustodian(custodian);
      if (onRequestReplaceManual) onRequestReplaceManual(run);
      else run();
    },
    [onPickCsvCustodian, onRequestReplaceManual],
  );

  const handleManualAdd = useCallback(() => {
    const run = () => onManualAdd();
    if (onRequestReplaceImport) onRequestReplaceImport(run);
    else run();
  }, [onManualAdd, onRequestReplaceImport]);

  const phaseTransitioning = overlayPhase !== displayPhase;
  const methodStageLayoutOpen = displayPhase === "method";
  const phasePanelLayoutOpen = displayPhase !== "method";
  const methodStageFadingOut =
    phaseTransitioning &&
    displayPhase === "method" &&
    overlayPhase !== "method";
  const phasePanelFadingOut =
    phaseTransitioning &&
    displayPhase !== "method" &&
    overlayPhase === "method";
  const menuLayoutPhase = displayPhase;
  const showMethodSelector = displayPhase === "method" && !methodStageFadingOut;

  const connectLabel = hasConnections
    ? (ctx?.connectButtonLabel ?? "Connect another account")
    : "Connect an account";

  const syncTitle = "Plaid synced";
  const syncTooltip = lastHealthySync ? (
    <>
      <span className="account-balances-manage__tooltip-title">
        {syncTitle}
      </span>
      <span className="account-balances-manage__tooltip-time">
        {formatPlaidSyncTime(lastHealthySync)}
      </span>
    </>
  ) : (
    syncTitle
  );

  return (
    <div
      className={["account-balances-manage", className]
        .filter(Boolean)
        .join(" ")}
    >
      {!hideTrigger && hasHealthyPlaid ? (
        <Tooltip content={syncTooltip} placement="bottom">
          <span
            className="account-balances-manage__sync-dot"
            aria-label={syncTitle}
          />
        </Tooltip>
      ) : null}
      {!hideTrigger ? (
        <button
          ref={triggerRef}
          type="button"
          className={[
            "holdings-scenario-trigger",
            "holdings-scenario-trigger--badge",
            "account-balances-manage__trigger",
            open && "account-balances-manage__trigger--open",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls="account-balances-manage-menu"
          aria-labelledby="account-balances-manage-label"
          disabled={ctx?.linkBusy}
          onClick={toggleMenu}
        >
          <span className="holdings-scenario-trigger__text">
            <span
              className="holdings-scenario-trigger__sublabel"
              id="account-balances-manage-label"
            >
              {MANAGE_SUBLABEL}
            </span>
            <span className="holdings-scenario-trigger__label-row">
              <span className="holdings-scenario-trigger__label">
                {MANAGE_VALUE_LABEL}
              </span>
              <span className="holdings-scenario-trigger__trail" aria-hidden>
                <IconChevronDown size={14} stroke={1.5} />
              </span>
            </span>
          </span>
        </button>
      ) : null}
      {open
        ? createPortal(
            <div
              className={[
                "account-balances-manage__backdrop",
                requiredEntry && "account-balances-manage__backdrop--required-entry",
                closing && "account-balances-manage__backdrop--closing",
              ]
                .filter(Boolean)
                .join(" ")}
              role="presentation"
              onMouseDown={handleBackdropMouseDown}
              onAnimationEnd={handleBackdropAnimationEnd}
            >
              <div
                ref={menuRef}
                id="account-balances-manage-menu"
                className={[
                  "account-balances-manage__menu",
                  menuLayoutPhase === "method" &&
                    "account-balances-manage__menu--method",
                  menuLayoutPhase === "manual" &&
                    "account-balances-manage__menu--manual",
                  menuLayoutPhase === "csv" &&
                    "account-balances-manage__menu--csv",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="dialog"
                aria-labelledby="account-balances-manage-panel-title"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <header
                  className={[
                    "account-balances-manage__header",
                    requiredEntry &&
                      "account-balances-manage__header--required-entry",
                    postOnboardingImport &&
                      "account-balances-manage__header--post-onboarding",
                    !showMethodSelector &&
                      "account-balances-manage__header--phase",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {showMethodSelector ? (
                    postOnboardingImport ? (
                      <div className="account-balances-manage__header-title-group">
                        <span
                          className="account-balances-manage__brand"
                          aria-hidden="true"
                        >
                          <span className="account-balances-manage__brand-expect">
                            Expect
                          </span>
                          <span className="account-balances-manage__brand-ifi">
                            ifi
                          </span>
                        </span>
                        <h2
                          id="account-balances-manage-panel-title"
                          className="account-balances-manage__title"
                        >
                          Add accounts
                        </h2>
                      </div>
                    ) : (
                      <h2
                        id="account-balances-manage-panel-title"
                        className="account-balances-manage__title"
                      >
                        Add accounts
                      </h2>
                    )
                  ) : (
                    <div className="account-balances-manage__header-main">
                      <button
                        type="button"
                        className="account-balances-manage__header-back"
                        aria-label="Back to Add accounts"
                        onClick={() => onBackToMethod?.()}
                      >
                        <IconArrowLeft size={14} stroke={1.5} aria-hidden />
                      </button>
                      <div className="account-balances-manage__header-text">
                        <div className="account-balances-manage__phase-title-row">
                          <h2
                            id="account-balances-manage-panel-title"
                            className="account-balances-manage__phase-title"
                          >
                            {phaseHeader?.title ?? "Add accounts"}
                          </h2>
                          {phaseHeader?.extra ? (
                            <div className="account-balances-manage__phase-extra">
                              {phaseHeader.extra}
                            </div>
                          ) : null}
                        </div>
                        {phaseHeader?.subtitle ? (
                          <p className="account-balances-manage__phase-subtitle">
                            {phaseHeader.subtitle}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                  {postOnboardingImport ? (
                    <button
                      type="button"
                      className="account-balances-manage__close"
                      aria-label="Cancel and return to home"
                      onClick={handlePostOnboardingCancel}
                    >
                      <IconX size={16} stroke={1.5} aria-hidden />
                    </button>
                  ) : !requiredEntry ? (
                    <button
                      type="button"
                      className="account-balances-manage__close"
                      aria-label="Close"
                      onClick={dismiss}
                    >
                      <IconX size={16} stroke={1.5} aria-hidden />
                    </button>
                  ) : null}
                </header>

                <div className="account-balances-manage__body">
                  <div
                    className={[
                      "account-balances-manage__phase-stage",
                      methodStageLayoutOpen &&
                        "account-balances-manage__phase-stage--active",
                      methodStageFadingOut &&
                        "account-balances-manage__phase-stage--fading-out",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden={
                      !methodStageLayoutOpen || methodStageFadingOut
                    }
                  >
                    <div className="account-balances-manage__phase-stage-inner">
                      <AppOverlayScrollbars
                        className={[
                          "account-balances-manage__scroll",
                          "side-panel-shell__scroll",
                          (removeConfirmOpen || replaceConfirmOpen) &&
                            "account-balances-manage__scroll--stacked-overlay",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        defer={false}
                      >
                        {ctx?.linkInfo ? (
                          <p
                            className="account-balances-manage__info"
                            role="status"
                          >
                            {ctx.linkInfo}
                          </p>
                        ) : null}

                        {manualReplaceNotice ? (
                          <p
                            className="account-balances-manage__replace-notice"
                            role="note"
                          >
                            {manualReplaceNotice}
                          </p>
                        ) : null}

                        {hasConnections && ctx ? (
                          <PlaidConnectionsSection
                            items={items}
                            linkBusy={ctx.linkBusy}
                            onReconnect={(id) => {
                              close();
                              ctx.reconnectItem(id);
                            }}
                            onDisconnect={ctx.disconnectItem}
                          />
                        ) : null}

                        {csvIngestActive && !exitingOverlayPhase ? (
                          <div
                            className="account-balances-manage__csv-preparing"
                            aria-hidden
                          >
                            {csvPanel}
                          </div>
                        ) : null}

                        <div className="account-balances-manage__panel-grid">
                  <div className="account-balances-manage__panel-col account-balances-manage__panel-col--plaid">
                    <div className="account-balances-manage__plaid-navy">
                      {showPlanBadges ? (
                        <span className="account-balances-manage__col-badge account-balances-manage__col-badge--pro">
                          Pro
                        </span>
                      ) : null}
                      <div className="account-balances-manage__plaid-content">
                        <img
                          className="account-balances-manage__plaid-logo"
                          src="/plaid-logo.svg"
                          alt=""
                          width={126}
                          height={48}
                          aria-hidden
                        />
                        <h3 className="account-balances-manage__plaid-heading">
                          Connect via Plaid
                        </h3>
                        <p className="account-balances-manage__plaid-subtext">
                          Securely link most banks and brokerages in seconds.
                          Works with Schwab, Vanguard, and thousands more.
                        </p>
                        <div className="account-balances-manage__plaid-white">
                          <button
                            type="button"
                            className="account-balances-manage__plaid-connect"
                            disabled={
                              hasPaidSubscription ? ctx?.linkBusy : false
                            }
                            onClick={handlePlaidConnect}
                          >
                            <IconLink size={14} stroke={1.5} aria-hidden />
                            {connectLabel}
                          </button>
                        </div>
                        <p className="account-balances-manage__fidelity-note">
                          Unfortunately Fidelity uses its own data network and
                          is not available through Plaid. Import a CSV using the
                          options on the right.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="account-balances-manage__panel-col account-balances-manage__panel-col--import">
                    {showPlanBadges ? (
                      <span className="account-balances-manage__col-badge account-balances-manage__col-badge--free">
                        Free
                      </span>
                    ) : null}
                    <div className="account-balances-manage__import-body">
                      <p className="account-balances-manage__import-label">
                        Import a CSV
                      </p>
                      <ul className="account-balances-manage__import-list">
                        {CSV_IMPORT_OPTIONS.map((o) => (
                          <li key={o.id}>
                            <button
                              type="button"
                              className="account-balances-manage__import-row"
                              onClick={() => handleCsvPick(o.id)}
                            >
                              <span
                                className={`account-balances-manage__brand-icon account-balances-manage__brand-icon--${o.id}`}
                                aria-hidden
                              >
                                {o.id === "schwab" ? "S" : o.label.charAt(0)}
                              </span>
                              <span className="account-balances-manage__import-row-text">
                                <span className="account-balances-manage__import-row-label">
                                  {o.label}
                                </span>
                                {CSV_EXPORT_HINTS[o.id] ? (
                                  <span className="account-balances-manage__import-row-hint">
                                    {CSV_EXPORT_HINTS[o.id]}
                                  </span>
                                ) : null}
                              </span>
                              <IconUpload
                                className="account-balances-manage__import-row-upload"
                                size={14}
                                stroke={1.5}
                                aria-hidden
                              />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="account-balances-manage__manual-section">
                        <button
                          type="button"
                          className="account-balances-manage__manual-row"
                          onClick={handleManualAdd}
                        >
                          <IconPencil size={16} stroke={1.5} aria-hidden />
                          Manually add accounts
                        </button>
                      </div>
                    </div>
                    {canClearAccounts ? (
                      <div className="account-balances-manage__import-footer">
                        <button
                          type="button"
                          className="account-balances-manage__clear-btn"
                          onClick={() => onClearAccounts()}
                        >
                          Clear all accounts
                        </button>
                      </div>
                    ) : null}
                  </div>
                        </div>

                        {ctx?.linkErr ? (
                          <p
                            className="account-balances-manage__err"
                            role="alert"
                          >
                            {ctx.linkErr}
                          </p>
                        ) : null}
                      </AppOverlayScrollbars>
                    </div>
                  </div>

                  <div
                    className={[
                      "account-balances-manage__phase-stage",
                      phasePanelLayoutOpen &&
                        "account-balances-manage__phase-stage--active",
                      phasePanelFadingOut &&
                        "account-balances-manage__phase-stage--fading-out",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden={
                      !phasePanelLayoutOpen || phasePanelFadingOut
                    }
                  >
                    <div className="account-balances-manage__phase-stage-inner">
                      <div
                        className={[
                          "account-balances-manage__phase-panel",
                          (menuLayoutPhase === "manual" ||
                            menuLayoutPhase === "csv" ||
                            exitingOverlayPhase) &&
                            "account-balances-manage__phase-panel--phase-body",
                          (removeConfirmOpen || replaceConfirmOpen) &&
                            "account-balances-manage__phase-panel--stacked-overlay",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {overlayPhase === "manual" ||
                        exitingOverlayPhase === "manual"
                          ? manualPanel
                          : null}
                        {overlayPhase === "csv" || exitingOverlayPhase === "csv"
                          ? csvPanel
                          : null}
                      </div>
                    </div>
                  </div>
                </div>
                {stackedOverlay}
                {csvFileInput}
              </div>
            </div>,
            document.body,
          )
        : null}
      <UpgradePrompt
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        onUpgrade={() => {
          setUpgradeOpen(false);
          onOpenUpgrade?.();
        }}
        title="Connect with live Plaid sync"
        description={
          user
            ? "Upgrade to Pro to link your brokerage accounts with automatic Plaid sync. CSV import and manual entry stay available on every plan."
            : "Create a Pro account to link brokerage accounts with live Plaid sync. CSV import and manual entry remain free."
        }
        feature="Live Plaid account linking"
      />
    </div>
  );
}
