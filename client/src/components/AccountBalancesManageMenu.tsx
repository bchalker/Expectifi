import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type AnimationEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconLink,
  IconPencil,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
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
import "./AccountBalancesManageMenu.scss";

const MANAGE_SUBLABEL = "Manage";
const MANAGE_VALUE_LABEL = "Financial Accounts";

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
  /** Hide the header trigger; use with `initialOpen` for empty-state auto-open. */
  hideTrigger?: boolean;
  /** Open the overlay on first mount (empty portfolio). */
  initialOpen?: boolean;
  /**
   * Empty portfolio: financial entry is required — hide dismiss controls
   * (not used when opened from the header Manage Financials trigger).
   */
  requiredEntry?: boolean;
  /** Opens Pro checkout / register flow from upgrade prompt. */
  onOpenUpgrade?: () => void;
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
  hideTrigger = false,
  initialOpen = false,
  requiredEntry = false,
  onOpenUpgrade,
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
    if (requiredEntry) return;
    close();
  }, [close, requiredEntry]);

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

  const lastOpenRequestRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!openRequest || lastOpenRequestRef.current === openRequest) return;
    lastOpenRequestRef.current = openRequest;
    openMenu();
  }, [openRequest, openMenu]);

  useEffect(() => {
    if (!open || closing || requiredEntry) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dismiss, closing, open, requiredEntry]);

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
      if ((e.target as HTMLElement).closest?.(".plaid-disconnect-popover"))
        return;
      dismiss();
    },
    [dismiss, requiredEntry],
  );

  const runAndClose = useCallback(
    (action: () => void) => {
      action();
      close();
    },
    [close],
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
      const run = () => runAndClose(() => onPickCsvCustodian(custodian));
      if (onRequestReplaceManual) onRequestReplaceManual(run);
      else run();
    },
    [onPickCsvCustodian, onRequestReplaceManual, runAndClose],
  );

  const handleManualAdd = useCallback(() => {
    const run = () => runAndClose(onManualAdd);
    if (onRequestReplaceImport) onRequestReplaceImport(run);
    else run();
  }, [onManualAdd, onRequestReplaceImport, runAndClose]);

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
                className="account-balances-manage__menu"
                role="dialog"
                aria-labelledby="account-balances-manage-panel-title"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <header
                  className={[
                    "account-balances-manage__header",
                    requiredEntry && "account-balances-manage__header--required-entry",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <h2
                    id="account-balances-manage-panel-title"
                    className="account-balances-manage__title"
                  >
                    Add accounts
                  </h2>
                  {!requiredEntry ? (
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

                {ctx?.linkInfo ? (
                  <p className="account-balances-manage__info" role="status">
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
                          onClick={() => runAndClose(onClearAccounts)}
                        >
                          Clear all accounts
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {ctx?.linkErr ? (
                  <p className="account-balances-manage__err" role="alert">
                    {ctx.linkErr}
                  </p>
                ) : null}
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
