import type { AnimationEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Checkbox, Label, ListBox, Select } from "@heroui/react";
import { AppButton } from "./ui/AppButton";
import { IconBuildingBank, IconCheck } from "@tabler/icons-react";
import { DetailsAccordion } from "./ui/DetailsAccordion";
import { ViewHoldingsHint } from "./ui/ViewHoldingsHint";
import { fmt } from "../utils/format";
import { AccountPositionsTable } from "./AccountPositionsBreakdown";
import type { ParsedPositionsCsv, AccountBucket } from "../lib/positionsCsv";
import {
  applyBucketAssignmentsToRows,
  buildDefaultAccountAssignments,
  fidelityAccountKey,
  IMPORT_ACCOUNT_BUCKET_SELECT_OPTIONS,
  isPendingActivityImportRow,
  uniqueAccountKeysFromRows,
} from "../lib/positionsCsv";
import {
  hashCsvText,
  isHashAlreadyImported,
  loadStoredPositionsImport,
  saveStoredPositionsImport,
  type PositionsImportBatch,
} from "../lib/positionsImportStorage";
import type { CalculatorInputs } from "../lib/computeResults";
import { custodianLogoPublicUrl } from "../lib/custodianLogos";
import {
  custodianDisplayName,
  parsePositionsCsv,
  peekCsvHeaderLabels,
  type OtherColumnMap,
  type PositionsCsvCustodian,
} from "../lib/positionsCsvImport";
import { AppOverlayScrollbars } from "./ui/AppOverlayScrollbars";
import { clearDashboardViewEnterAttrs } from "../lib/dashboardViewReveal";
import {
  markPortfolioBalancesFlush,
  triggerPortfolioWaveReveal,
} from "../lib/portfolioWaveReveal";
import { CSV_IMPORT_MANUAL_ACK_MSG } from "../lib/portfolioSourceExclusivity";
import { applyImportWithIntent } from "../lib/csvImportApply";
import {
  computeCustodianImportDiff,
  defaultRemovedActions,
  hasStoredHoldings,
  type ImportIntent,
  type RemovedHoldingAction,
} from "../lib/csvImportDiff";
import { buildImportIntentExamples } from "../lib/csvImportIntentExamples";
import {
  custodianToBrokerSource,
  stampRowsWithBrokerSource,
} from "../lib/brokerMonogram";
import "./SidePanelShell.scss";
import "./PositionsCsvImport.scss";

type PostReviewStep = "review" | "intent" | "diff";

type Props = {
  onApplyBalances: (
    partial: Pick<
      CalculatorInputs,
      "base401k" | "baseSE401k" | "baseRoth" | "baseHsa" | "brkBal"
    >,
  ) => void;
  onImportApplied?: () => void;
  variant?: "default" | "toolbar";
  /** Full-viewport modal (default) or in-card slide panel. */
  presentation?: "modal" | "panel";
  /** Controlled open state when `presentation` is `panel`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  /** When the import flow mounts, pre-select this custodian (e.g. from dashboard picker). */
  initialCustodian?: PositionsCsvCustodian | null;
  /** Called when the import modal/panel is dismissed (after close, before inner state reset). */
  onImportFlowClose?: () => void;
  /** Parent picked custodian + file (e.g. empty-state flow): skip custodian grid and immediate file row. */
  fileIngestRequest?: {
    id: number;
    file: File;
    custodian: PositionsCsvCustodian;
  } | null;
  onFileIngestConsumed?: () => void;
  /** When true, show that confirming will clear manual balance entry. */
  showManualReplaceNotice?: boolean;
  /** Hide the footer Cancel control (e.g. embedded in multi-state manage overlay). */
  hideCancelButton?: boolean;
  /** Hide the in-panel header; parent renders title in the manage overlay shell. */
  hidePanelHeader?: boolean;
  /** Reports header copy when `hidePanelHeader` is true. */
  onPanelHeaderChange?: (header: {
    title: string;
    subtitle?: string;
    extra?: string;
  }) => void;
  /** Fired after a picked file has been read and parsed (or failed) and review UI is ready. */
  onImportReviewReady?: () => void;
};

type PendingImport = {
  fileName: string;
  contentHash: string;
  parsed: ParsedPositionsCsv;
  duplicateInStorage: boolean;
  duplicateInSelection: boolean;
};

type ImportBusyState = {
  headline: string;
  details: string[];
};

const IMPORT_APPLY_FADE_MS = 280;

type ConfirmOverlayState =
  | { mode: "idle" }
  | { mode: "applying" }
  | { mode: "exiting" }
  | { mode: "error"; message: string };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(file);
  });
}

function buildIncomingBatches(
  pending: PendingImport | null,
  replaceDuplicateImports: boolean,
  custodian: PositionsCsvCustodian | null,
  reviewAssignments: Record<string, AccountBucket>,
): PositionsImportBatch[] {
  if (!pending || pending.duplicateInSelection) return [];
  if (pending.duplicateInStorage && !replaceDuplicateImports) return [];
  if (!custodian) return [];
  const now = new Date().toISOString();
  const rows = stampRowsWithBrokerSource(
    applyBucketAssignmentsToRows(pending.parsed.rows, reviewAssignments),
    custodianToBrokerSource(custodian),
  );
  return [
    {
      contentHash: pending.contentHash,
      fileName: pending.fileName,
      importedAt: now,
      rows,
      custodian,
    },
  ];
}

const CUSTODIANS: {
  id: PositionsCsvCustodian;
  label: string;
  logoUrl: string | null;
}[] = [
  {
    id: "fidelity",
    label: "Fidelity",
    logoUrl: custodianLogoPublicUrl("fidelity"),
  },
  {
    id: "schwab",
    label: "Charles Schwab",
    logoUrl: custodianLogoPublicUrl("schwab"),
  },
  {
    id: "vanguard",
    label: "Vanguard",
    logoUrl: custodianLogoPublicUrl("vanguard"),
  },
  { id: "webull", label: "Webull", logoUrl: custodianLogoPublicUrl("webull") },
  { id: "other", label: "Other", logoUrl: null },
];

const EMPTY_OTHER: OtherColumnMap = {
  symbol: "",
  name: "",
  currentValue: "",
  costBasis: "",
};

const IMPORT_BUCKET_VALUES = new Set(
  IMPORT_ACCOUNT_BUCKET_SELECT_OPTIONS.map((o) => o.value),
);

function firstKeyFromSelectSelection(keys: unknown): string | null {
  if (keys == null || keys === "all") return null;
  if (
    typeof keys === "object" &&
    "values" in keys &&
    typeof (keys as { values: () => Iterator<unknown> }).values === "function"
  ) {
    const it = (keys as Set<unknown>).values().next();
    return it.done || it.value == null ? null : String(it.value);
  }
  return String(keys);
}

function isImportBucketValue(
  v: string,
): v is Exclude<AccountBucket, "unknown"> {
  return IMPORT_BUCKET_VALUES.has(v as Exclude<AccountBucket, "unknown">);
}

export function PositionsCsvImport({
  onApplyBalances,
  onImportApplied,
  variant = "default",
  presentation = "modal",
  open: openControlled,
  onOpenChange,
  hideTrigger = false,
  initialCustodian = null,
  onImportFlowClose,
  fileIngestRequest = null,
  onFileIngestConsumed,
  showManualReplaceNotice = false,
  hideCancelButton = false,
  hidePanelHeader = false,
  onPanelHeaderChange,
  onImportReviewReady,
}: Props) {
  const isPanel = presentation === "panel";
  const pickInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const duplicateReplaceId = useId();
  const manualReplaceAckId = useId();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const flowOpen = isPanel ? Boolean(openControlled) : modalOpen;
  const [custodian, setCustodian] = useState<PositionsCsvCustodian | null>(
    () => initialCustodian ?? null,
  );
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [otherMap, setOtherMap] = useState<OtherColumnMap>(EMPTY_OTHER);
  const [headerOptions, setHeaderOptions] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState<ImportBusyState | null>(null);
  const [confirmOverlay, setConfirmOverlay] = useState<ConfirmOverlayState>({
    mode: "idle",
  });

  useEffect(() => {
    return () => {
      clearDashboardViewEnterAttrs();
    };
  }, []);
  const [replaceDuplicateImports, setReplaceDuplicateImports] = useState(false);
  const [manualReplaceAcknowledged, setManualReplaceAcknowledged] =
    useState(false);
  const [reviewAssignments, setReviewAssignments] = useState<
    Record<string, AccountBucket>
  >({});
  const [postReviewStep, setPostReviewStep] =
    useState<PostReviewStep>("review");
  const [importIntent, setImportIntent] = useState<ImportIntent | null>(null);
  const [removedActions, setRemovedActions] = useState<
    Record<string, RemovedHoldingAction>
  >({});
  const [hideImportSourceUi, setHideImportSourceUi] = useState(
    () => Boolean(fileIngestRequest) || isPanel,
  );
  const lastFileIngestIdRef = useRef<number | null>(null);

  function resetModalInner(options?: { seedCustodianFromProps?: boolean }) {
    setHideImportSourceUi(false);
    setCustodian(
      options?.seedCustodianFromProps ? (initialCustodian ?? null) : null,
    );
    setStagedFile(null);
    setOtherMap(EMPTY_OTHER);
    setHeaderOptions([]);
    setPending(null);
    setParseError(null);
    setReplaceDuplicateImports(false);
    setManualReplaceAcknowledged(false);
    setReviewAssignments({});
    setPostReviewStep("review");
    setImportIntent(null);
    setRemovedActions({});
    setConfirmOverlay({ mode: "idle" });
    if (pickInputRef.current) pickInputRef.current.value = "";
  }

  function openFlow() {
    resetModalInner({ seedCustodianFromProps: true });
    setModalClosing(false);
    if (isPanel) onOpenChange?.(true);
    else setModalOpen(true);
  }

  function completeCloseFlow() {
    setModalClosing(false);
    onImportFlowClose?.();
    if (isPanel) {
      onOpenChange?.(false);
      // Parent unmounts after close animation — resetting here flashes the custodian picker.
    } else {
      setModalOpen(false);
      // Defer reset to openFlow() so the closing modal never flashes the custodian grid.
    }
  }

  function closeFlow() {
    if (!isPanel && modalOpen && !modalClosing) {
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        completeCloseFlow();
        return;
      }
      setModalClosing(true);
      return;
    }
    completeCloseFlow();
  }

  const onModalOverlayAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.animationName !== "csv-import-modal-fade-out") return;
    if (!modalClosing) return;
    completeCloseFlow();
  };

  function stagePickedCsvFile(f: File, c: PositionsCsvCustodian) {
    const name = f.name.toLowerCase();
    if (
      !name.endsWith(".csv") &&
      f.type !== "text/csv" &&
      f.type !== "application/csv" &&
      f.type !== "application/vnd.ms-excel"
    ) {
      setStagedFile(null);
      setPending(null);
      setParseError(
        `We couldn't read this file. Make sure you're uploading a positions export from ${custodianDisplayName(c)} and try again.`,
      );
      return;
    }
    setCustodian(c);
    setStagedFile(f);
    setParseError(null);
    setPending(null);
    setReplaceDuplicateImports(false);
    setManualReplaceAcknowledged(false);
    setPostReviewStep("review");
    setImportIntent(null);
    setRemovedActions({});
    if (c === "other") {
      void readFileAsText(f).then((text) => {
        setHeaderOptions(peekCsvHeaderLabels(text));
        setOtherMap(EMPTY_OTHER);
      });
    } else {
      setHeaderOptions([]);
    }
  }

  useEffect(() => {
    if (!fileIngestRequest) {
      lastFileIngestIdRef.current = null;
      return;
    }
    if (lastFileIngestIdRef.current === fileIngestRequest.id) return;
    lastFileIngestIdRef.current = fileIngestRequest.id;
    setHideImportSourceUi(true);
    if (!isPanel) setModalOpen(true);
    stagePickedCsvFile(fileIngestRequest.file, fileIngestRequest.custodian);
    queueMicrotask(() => onFileIngestConsumed?.());
  }, [fileIngestRequest, isPanel, onFileIngestConsumed]);

  const otherMapReady =
    custodian !== "other" ||
    (Boolean(otherMap.symbol) &&
      Boolean(otherMap.name) &&
      Boolean(otherMap.currentValue));

  useEffect(() => {
    if (!flowOpen) return;
    if (!custodian || !stagedFile) {
      setPending(null);
      setParseError(null);
      setReviewAssignments({});
      return;
    }
    if (custodian === "other" && !otherMapReady) {
      setPending(null);
      setParseError(null);
      setReviewAssignments({});
      return;
    }

    let cancelled = false;
    setManualReplaceAcknowledged(false);
    (async () => {
      setParseError(null);
      setImportBusy({
        headline: "Reading file",
        details: [
          stagedFile.name,
          `Custodian: ${custodianDisplayName(custodian)}`,
        ],
      });
      try {
        const text = await readFileAsText(stagedFile);
        if (cancelled) return;
        setImportBusy({
          headline: "Fingerprinting",
          details: [stagedFile.name, "Computing a hash of the file contents"],
        });
        const contentHash = await hashCsvText(text);
        if (cancelled) return;
        setImportBusy({
          headline: "Parsing positions",
          details: [
            `Format: ${custodianDisplayName(custodian)}`,
            "Reading symbols, account names, and market values from each row",
          ],
        });
        const parsed =
          custodian === "other"
            ? parsePositionsCsv("other", text, otherMap)
            : parsePositionsCsv(custodian, text);
        if (cancelled) return;

        setImportBusy({
          headline: "Checking saved imports",
          details: [
            "Comparing this file to imports already saved in this browser",
          ],
        });
        const existing = loadStoredPositionsImport();
        const duplicateInStorage = isHashAlreadyImported(contentHash, existing);

        const rowCount = parsed.rows.length;
        setImportBusy({
          headline: "Preparing review",
          details:
            rowCount > 0
              ? [
                  `${rowCount} position row${rowCount === 1 ? "" : "s"} loaded`,
                  "Map each account to a tax bucket below",
                ]
              : [
                  "No position rows found in this file",
                  "Try another export or adjust column mapping for Other",
                ],
        });

        setPending({
          fileName: stagedFile.name,
          contentHash,
          parsed,
          duplicateInStorage,
          duplicateInSelection: false,
        });
        setPostReviewStep("review");
        setImportIntent(null);
        setRemovedActions({});

        if (!parsed.rows.length) {
          setReviewAssignments({});
          setParseError(
            `We couldn't read this file. Make sure you're uploading a positions export from ${custodianDisplayName(custodian)} and try again.`,
          );
        } else {
          setReviewAssignments(buildDefaultAccountAssignments(parsed.rows));
          setParseError(null);
        }
      } catch {
        if (!cancelled) {
          setPending(null);
          setReviewAssignments({});
          setParseError(
            `We couldn't read this file. Make sure you're uploading a positions export from ${custodianDisplayName(custodian ?? "other")} and try again.`,
          );
        }
      } finally {
        if (!cancelled) {
          setImportBusy(null);
          onImportReviewReady?.();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    flowOpen,
    custodian,
    stagedFile,
    otherMapReady,
    otherMap.symbol,
    otherMap.name,
    otherMap.currentValue,
    otherMap.costBasis,
    onImportReviewReady,
  ]);

  const incomingBatches = useMemo(
    () =>
      buildIncomingBatches(
        pending,
        replaceDuplicateImports,
        custodian,
        reviewAssignments,
      ),
    [pending, replaceDuplicateImports, custodian, reviewAssignments],
  );

  const accountReviewRows = useMemo(() => {
    if (!pending?.parsed.rows.length)
      return [] as { key: string; label: string; total: number }[];
    const keys = uniqueAccountKeysFromRows(pending.parsed.rows);
    return keys
      .map((k) => ({
        key: k,
        label: k === "(blank)" ? "(missing account name)" : k,
        total: pending.parsed.rows
          .filter(
            (r) =>
              fidelityAccountKey(r.accountName) === k &&
              !isPendingActivityImportRow(r),
          )
          .reduce((s, r) => s + r.currentValue, 0),
      }))
      .filter((row) => row.total > 0);
  }, [pending]);

  const reviewAssignmentsComplete = useMemo(() => {
    if (!accountReviewRows.length) return false;
    return accountReviewRows.every((row) => {
      const b = reviewAssignments[row.key];
      return b !== undefined && b !== "unknown";
    });
  }, [accountReviewRows, reviewAssignments]);

  const rowsThisSelection = useMemo(
    () =>
      pending
        ? applyBucketAssignmentsToRows(pending.parsed.rows, reviewAssignments)
        : [],
    [pending, reviewAssignments],
  );

  const hasExistingHoldings = useMemo(() => {
    if (!pending) return false;
    return hasStoredHoldings(loadStoredPositionsImport());
  }, [pending]);

  const importDiff = useMemo(() => {
    if (!pending || !custodian || importIntent !== "update") return null;
    return computeCustodianImportDiff(
      loadStoredPositionsImport(),
      rowsThisSelection,
      custodian,
    );
  }, [pending, custodian, importIntent, rowsThisSelection]);

  const intentExamples = useMemo(() => {
    if (!hasExistingHoldings) return null;
    return buildImportIntentExamples();
  }, [hasExistingHoldings, pending, postReviewStep]);

  const hasStorageDuplicate = Boolean(pending?.duplicateInStorage);
  const manualReplaceAckOk =
    !showManualReplaceNotice || manualReplaceAcknowledged;
  const duplicateAckOk = !hasStorageDuplicate || replaceDuplicateImports;

  const canProceedFromReview =
    Boolean(
      pending?.parsed.rows.length && !parseError && incomingBatches.length > 0,
    ) &&
    reviewAssignmentsComplete &&
    manualReplaceAckOk &&
    duplicateAckOk;

  const canProceedFromIntent = canProceedFromReview && importIntent !== null;

  function onPrimaryFooterPress() {
    if (!canProceedFromReview) return;
    if (postReviewStep === "review") {
      if (hasExistingHoldings) {
        setPostReviewStep("intent");
        return;
      }
      void applyImportWithProgress();
      return;
    }
    if (postReviewStep === "intent") {
      if (importIntent === "update" && importDiff) {
        setRemovedActions(defaultRemovedActions(importDiff.removed));
        setPostReviewStep("diff");
        return;
      }
      void applyImportWithProgress();
      return;
    }
    void applyImportWithProgress();
  }

  function onBackFromPostReview() {
    if (postReviewStep === "diff") {
      setPostReviewStep("intent");
      return;
    }
    if (postReviewStep === "intent") {
      setPostReviewStep("review");
      setImportIntent(null);
    }
  }

  const primaryFooterLabel =
    postReviewStep === "review"
      ? hasExistingHoldings
        ? "Continue"
        : "Confirm"
      : postReviewStep === "intent" && importIntent === "update"
        ? "Continue"
        : "Confirm";

  const primaryFooterEnabled =
    postReviewStep === "review"
      ? canProceedFromReview
      : postReviewStep === "intent"
        ? canProceedFromIntent
        : canProceedFromIntent;

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !custodian) return;
    stagePickedCsvFile(f, custodian);
  }

  const confirmBlocking =
    confirmOverlay.mode === "applying" || confirmOverlay.mode === "exiting";

  async function applyImportWithProgress() {
    if (!pending?.parsed.rows.length || !custodian) return;
    const p = pending;
    const cust = custodian;
    const rep = replaceDuplicateImports;
    const ra = { ...reviewAssignments };
    const rows = applyBucketAssignmentsToRows(p.parsed.rows, ra);
    setConfirmOverlay({ mode: "applying" });

    try {
      if (!p.parsed.rows.length) throw new Error("CSV has no data rows.");
      const sample = p.parsed.rows[0];
      if (
        typeof sample.currentValue !== "number" ||
        Number.isNaN(sample.currentValue)
      ) {
        throw new Error("Parsed positions are invalid.");
      }
      for (const r of rows) {
        if (!Number.isFinite(r.currentValue)) {
          throw new Error("One or more holdings have an invalid value.");
        }
      }

      const incoming = buildIncomingBatches(p, rep, cust, ra);
      if (!incoming.length) {
        throw new Error(
          "Could not build import from the current review state.",
        );
      }

      const existing = loadStoredPositionsImport();
      const intent: ImportIntent = hasExistingHoldings
        ? (importIntent ?? "add")
        : "add";
      const next = applyImportWithIntent(existing, incoming, {
        intent,
        replaceDuplicateHashes: rep,
        removedActions: intent === "update" ? removedActions : undefined,
      });
      saveStoredPositionsImport(next);
      const mergedBalances = next.balances;

      setConfirmOverlay({ mode: "exiting" });

      markPortfolioBalancesFlush();
      onApplyBalances(mergedBalances);
      triggerPortfolioWaveReveal();

      await sleep(IMPORT_APPLY_FADE_MS);
      onImportApplied?.();
      closeFlow();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      setConfirmOverlay({ mode: "error", message: msg });
    }
  }

  const renderImportBody = () => {
    const showSourcePickers =
      !isPanel &&
      !hideImportSourceUi &&
      confirmOverlay.mode === "idle" &&
      !stagedFile &&
      !pending &&
      !importBusy;
    return (
      <>
        {custodian ? (
          <input
            ref={pickInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            id={fileInputId}
            onChange={onFileInputChange}
          />
        ) : null}

        {showSourcePickers ? (
          <div
            className="csv-import-custodian-grid"
            role="listbox"
            aria-label="Custodian"
          >
            {CUSTODIANS.map((c) => {
              const selected = custodian === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`csv-import-custodian-card${selected ? " csv-import-custodian-card--selected" : ""}`}
                  onClick={() => {
                    setCustodian(c.id);
                    setStagedFile(null);
                    setPending(null);
                    setParseError(null);
                    setReplaceDuplicateImports(false);
                    setManualReplaceAcknowledged(false);
                    setOtherMap(EMPTY_OTHER);
                    setHeaderOptions([]);
                    if (pickInputRef.current) pickInputRef.current.value = "";
                  }}
                >
                  <div className="csv-import-custodian-card__logo-wrap">
                    {c.logoUrl ? (
                      <img
                        className="csv-import-custodian-card__logo"
                        src={c.logoUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <IconBuildingBank size={28} stroke={1.5} aria-hidden />
                    )}
                  </div>
                  <span className="csv-import-custodian-card__name">
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {showSourcePickers && custodian ? (
          <div className="csv-import-upload">
            <label htmlFor={fileInputId} className="csv-import-upload__label">
              Choose CSV file
            </label>
          </div>
        ) : null}

        {hideImportSourceUi && parseError && custodian ? (
          <div className="csv-import-upload csv-import-upload--retry">
            <button
              type="button"
              className="csv-import-upload__label"
              onClick={() => pickInputRef.current?.click()}
            >
              Choose another CSV file…
            </button>
          </div>
        ) : null}

        {custodian === "other" && stagedFile && headerOptions.length > 0 ? (
          <div className="csv-import-other-map">
            <div className="csv-import-other-map__row">
              <span className="csv-import-other-map__label">Symbol</span>
              <select
                className="csv-import-select-sm"
                value={otherMap.symbol}
                onChange={(e) =>
                  setOtherMap((m) => ({ ...m, symbol: e.target.value }))
                }
              >
                <option value="">—</option>
                {headerOptions.map((h) => (
                  <option key={`sym-${h}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="csv-import-other-map__row">
              <span className="csv-import-other-map__label">Name</span>
              <select
                className="csv-import-select-sm"
                value={otherMap.name}
                onChange={(e) =>
                  setOtherMap((m) => ({ ...m, name: e.target.value }))
                }
              >
                <option value="">—</option>
                {headerOptions.map((h) => (
                  <option key={`name-${h}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="csv-import-other-map__row">
              <span className="csv-import-other-map__label">Current Value</span>
              <select
                className="csv-import-select-sm"
                value={otherMap.currentValue}
                onChange={(e) =>
                  setOtherMap((m) => ({ ...m, currentValue: e.target.value }))
                }
              >
                <option value="">—</option>
                {headerOptions.map((h) => (
                  <option key={`val-${h}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="csv-import-other-map__row">
              <span className="csv-import-other-map__label">
                Cost Basis (optional)
              </span>
              <select
                className="csv-import-select-sm"
                value={otherMap.costBasis}
                onChange={(e) =>
                  setOtherMap((m) => ({ ...m, costBasis: e.target.value }))
                }
              >
                <option value="">—</option>
                {headerOptions.map((h) => (
                  <option key={`cost-${h}`} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {parseError ? (
          <div className="csv-import-error">{parseError}</div>
        ) : null}

        {pending && pending.parsed.rows.length > 0 && !parseError ? (
          <>
            {postReviewStep === "review" ? (
              <>
                {!reviewAssignmentsComplete ? (
                  <div className="csv-import-review-hint csv-import-review-hint--warn">
                    Assign a tax bucket to every account below before importing.
                    Unrecognized names start as &ldquo;Unmapped&rdquo; — choose
                    Pre-tax, Roth, HSA, or Brokerage.
                  </div>
                ) : null}

                <div className="csv-import-review">
                  <div
                    className={`csv-import-review-list${confirmBlocking ? " csv-import-review-list--applying" : ""}`}
                    role="list"
                    aria-label="Per-account bucket assignments"
                  >
                    {accountReviewRows.map((row, index) => {
                      const sel = reviewAssignments[row.key];
                      const unknown = sel === "unknown" || sel === undefined;
                      const accountRows = rowsThisSelection.filter(
                        (r) =>
                          fidelityAccountKey(r.accountName) === row.key &&
                          !isPendingActivityImportRow(r),
                      );
                      return (
                        <DetailsAccordion
                          key={row.key}
                          className={`imported-account-disclosure csv-import-review-acct${unknown ? " csv-import-review-acct--attention" : ""}`}
                          style={{ animationDelay: `${index * 0.055}s` }}
                          summary={
                            <>
                              <div className="csv-import-review-acct__identity">
                                <span className="imported-account-name csv-import-review-acct__name">
                                  {row.label}
                                </span>
                              </div>
                              <div
                                className="csv-import-review-acct__bucket"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <Select
                                  className="csv-import-review-bucket-select app-select--compact"
                                  variant="secondary"
                                  aria-label={`Tax bucket for ${row.label}`}
                                  placeholder="Unmapped — choose…"
                                  selectedKey={unknown ? null : sel}
                                  isDisabled={confirmBlocking}
                                  onSelectionChange={(keys) => {
                                    const id = firstKeyFromSelectSelection(keys);
                                    if (!id || !isImportBucketValue(id)) return;
                                    setReviewAssignments((m) => ({
                                      ...m,
                                      [row.key]: id,
                                    }));
                                  }}
                                >
                                  <Select.Trigger>
                                    <Select.Value />
                                    <Select.Indicator />
                                  </Select.Trigger>
                                  <Select.Popover className="app-select-import-menu__popover">
                                    <ListBox className="app-select-import-menu__list">
                                      {IMPORT_ACCOUNT_BUCKET_SELECT_OPTIONS.map(
                                        (o) => (
                                          <ListBox.Item
                                            key={o.value}
                                            id={o.value}
                                            textValue={o.label}
                                          >
                                            {o.label}
                                          </ListBox.Item>
                                        ),
                                      )}
                                    </ListBox>
                                  </Select.Popover>
                                </Select>
                              </div>
                              <span className="csv-import-review-acct__summary-end">
                                <div className="csv-import-review-acct__values">
                                  <div className="csv-import-review-acct__amount-row">
                                    <span className="imported-account-summary-total">
                                      {fmt(row.total)}
                                    </span>
                                    <ViewHoldingsHint />
                                  </div>
                                </div>
                              </span>
                            </>
                          }
                        >
                          <AccountPositionsTable
                            rows={accountRows}
                            showScenarioColumn={false}
                          />
                        </DetailsAccordion>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}

            {postReviewStep === "intent" && intentExamples ? (
              <div className="csv-import-intent">
                <h3 className="csv-import-intent__title">
                  You already have holdings loaded
                </h3>
                <p className="csv-import-intent__lead">
                  How should this file affect your current portfolio?
                </p>
                <div
                  className="csv-import-intent__options"
                  role="radiogroup"
                  aria-label="Import intent"
                >
                  <div className="csv-import-intent__pair">
                    <label
                      className={`csv-import-intent__option${importIntent === "update" ? " csv-import-intent__option--selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="csv-import-intent"
                        className="csv-import-intent__radio"
                        checked={importIntent === "update"}
                        disabled={confirmBlocking}
                        onChange={() => setImportIntent("update")}
                      />
                      <span className="csv-import-intent__option-body">
                        <span className="csv-import-intent__option-title">
                          Update existing
                        </span>
                        <span className="csv-import-intent__option-desc">
                          Revise values for holdings you already have, add new
                          ones, and flag anything no longer in this file.
                        </span>
                        <span className="csv-import-intent__option-example">
                          {intentExamples.update}
                        </span>
                      </span>
                    </label>
                    <label
                      className={`csv-import-intent__option${importIntent === "add" ? " csv-import-intent__option--selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="csv-import-intent"
                        className="csv-import-intent__radio"
                        checked={importIntent === "add"}
                        disabled={confirmBlocking}
                        onChange={() => setImportIntent("add")}
                      />
                      <span className="csv-import-intent__option-body">
                        <span className="csv-import-intent__option-title">
                          Add from new source
                        </span>
                        <span className="csv-import-intent__option-desc">
                          Append these holdings without touching your current
                          ones.
                        </span>
                        <span className="csv-import-intent__option-example">
                          {intentExamples.add}
                        </span>
                      </span>
                    </label>
                  </div>
                  <label
                    className={`csv-import-intent__option csv-import-intent__option--replace${importIntent === "replace" ? " csv-import-intent__option--selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="csv-import-intent"
                      className="csv-import-intent__radio csv-import-intent__radio--replace"
                      checked={importIntent === "replace"}
                      disabled={confirmBlocking}
                      onChange={() => setImportIntent("replace")}
                    />
                    <span className="csv-import-intent__option-body">
                      <span className="csv-import-intent__option-title">
                        Replace all
                      </span>
                      <span className="csv-import-intent__option-desc">
                        Remove all current holdings and start fresh with this
                        file.
                      </span>
                      <span className="csv-import-intent__option-example">
                        {intentExamples.replace}
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            ) : null}

            {postReviewStep === "diff" && importDiff ? (
              <div className="csv-import-diff">
                <h3 className="csv-import-diff__title">Import changes</h3>
                <p className="csv-import-diff__counts">
                  <span className="csv-import-diff__count">
                    {importDiff.counts.updated} updated
                  </span>
                  <span className="csv-import-diff__sep" aria-hidden>
                    ·
                  </span>
                  <span className="csv-import-diff__count">
                    {importDiff.counts.added} added
                  </span>
                  <span className="csv-import-diff__sep" aria-hidden>
                    ·
                  </span>
                  <span className="csv-import-diff__count">
                    {importDiff.counts.unchanged} unchanged
                  </span>
                </p>
                {importDiff.removed.length > 0 ? (
                  <div className="csv-import-diff__removed">
                    <p className="csv-import-diff__removed-heading">
                      No longer in this file:
                    </p>
                    <ul className="csv-import-diff__removed-list">
                      {importDiff.removed.map((item) => {
                        const action =
                          removedActions[item.key] ?? ("keep" as const);
                        return (
                          <li
                            key={item.key}
                            className="csv-import-diff__removed-row"
                          >
                            <span className="csv-import-diff__removed-label">
                              {item.displayLabel}
                            </span>
                            <span className="csv-import-diff__removed-value tabular-nums">
                              {fmt(item.row.currentValue)}
                            </span>
                            <span className="csv-import-diff__removed-actions">
                              <AppButton
                                size="sm"
                                variant={
                                  action === "keep" ? "primary" : "ghost"
                                }
                                isDisabled={confirmBlocking}
                                onPress={() =>
                                  setRemovedActions((m) => ({
                                    ...m,
                                    [item.key]: "keep",
                                  }))
                                }
                              >
                                Keep
                              </AppButton>
                              <AppButton
                                size="sm"
                                variant={
                                  action === "remove" ? "primary" : "ghost"
                                }
                                isDisabled={confirmBlocking}
                                onPress={() =>
                                  setRemovedActions((m) => ({
                                    ...m,
                                    [item.key]: "remove",
                                  }))
                                }
                              >
                                Remove
                              </AppButton>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {confirmOverlay.mode === "error" ? (
              <div className="csv-import-error" role="alert">
                {confirmOverlay.message}
              </div>
            ) : null}
          </>
        ) : null}
      </>
    );
  };

  const importFlowExiting = confirmOverlay.mode === "exiting";
  const holdingsRowCount = pending?.parsed.rows.length ?? 0;
  const isAccountMappingStep =
    postReviewStep === "review" && holdingsRowCount > 0 && !parseError;
  const holdingsCountLabel =
    holdingsRowCount === 1 ? "1 holding" : `${holdingsRowCount} holdings`;
  const showFooterHoldingsSummary = holdingsRowCount > 0 && !parseError;
  const panelHeaderTitle = isAccountMappingStep
    ? "Map your imported accounts"
    : "Import positions CSV";
  const panelHeaderSubtitle =
    postReviewStep === "intent"
      ? "Choose how this import should merge with your existing holdings."
      : postReviewStep === "diff"
        ? "Review what will change, then confirm. Removed holdings stay unless you choose Remove."
        : isAccountMappingStep
          ? "Adjust tax buckets as needed."
          : isPanel || hideImportSourceUi || stagedFile || pending
            ? "Review each account and map it to the correct tax bucket, then confirm."
            : "Choose your custodian, then select a single positions export file.";

  useEffect(() => {
    if (!hidePanelHeader || !onPanelHeaderChange) return;
    onPanelHeaderChange({
      title: panelHeaderTitle,
      subtitle: panelHeaderSubtitle,
    });
  }, [
    hidePanelHeader,
    onPanelHeaderChange,
    panelHeaderSubtitle,
    panelHeaderTitle,
  ]);

  const flowShell = (
    <div
      className={[
        isPanel ? "csv-import-panel-shell" : "csv-import-modal-shell",
        hidePanelHeader && isPanel && "csv-import-panel-shell--no-header",
        importFlowExiting && "csv-import-flow-shell--exiting",
      ]
        .filter(Boolean)
        .join(" ")}
      role="dialog"
      aria-modal={isPanel ? undefined : true}
      aria-labelledby={
        hidePanelHeader && isPanel
          ? "account-balances-manage-panel-title"
          : "csv-import-modal-title"
      }
    >
      {hidePanelHeader ? null : (
        <header className="csv-import-modal-header">
          <h2 id="csv-import-modal-title" className="csv-import-modal__title">
            {panelHeaderTitle}
          </h2>
          <p className="csv-import-modal__lead">{panelHeaderSubtitle}</p>
        </header>
      )}
      <AppOverlayScrollbars
        className="side-panel-shell__scroll csv-import-modal-scroll"
        defer={false}
      >
        <div className="csv-import-modal-body">{renderImportBody()}</div>
      </AppOverlayScrollbars>
      {showManualReplaceNotice &&
      pending &&
      pending.parsed.rows.length > 0 &&
      !parseError ? (
        <div className="csv-import-manual-replace-notice">
          <Checkbox
            id={manualReplaceAckId}
            className="app-checkbox"
            isSelected={manualReplaceAcknowledged}
            onChange={setManualReplaceAcknowledged}
            variant="secondary"
          >
            <Checkbox.Control>
              <Checkbox.Indicator>
                <IconCheck size={12} stroke={2.5} aria-hidden />
              </Checkbox.Indicator>
            </Checkbox.Control>
            <Checkbox.Content>
              <Label className="csv-import-manual-replace-notice__label">
                {CSV_IMPORT_MANUAL_ACK_MSG}
              </Label>
            </Checkbox.Content>
          </Checkbox>
        </div>
      ) : null}
      {pending &&
      pending.parsed.rows.length > 0 &&
      !parseError &&
      hasStorageDuplicate ? (
        <div className="csv-import-duplicate-notice">
          <Checkbox
            id={duplicateReplaceId}
            className="app-checkbox"
            isSelected={replaceDuplicateImports}
            onChange={setReplaceDuplicateImports}
            variant="secondary"
          >
            <Checkbox.Control>
              <Checkbox.Indicator>
                <IconCheck size={12} stroke={2.5} aria-hidden />
              </Checkbox.Indicator>
            </Checkbox.Control>
            <Checkbox.Content>
              <Label className="csv-import-duplicate-notice__label">
                Seems like a duplicate. Continue replacing?
              </Label>
            </Checkbox.Content>
          </Checkbox>
        </div>
      ) : null}
      <footer className="csv-import-modal-footer">
        <div
          className={[
            "csv-import-modal-footer__row",
            hideCancelButton && "csv-import-modal-footer__row--no-cancel",
            isAccountMappingStep &&
              hideCancelButton &&
              !showFooterHoldingsSummary &&
              "csv-import-modal-footer__row--confirm-only",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {hideCancelButton ? null : (
            <AppButton
              size="sm"
              variant="ghost"
              isDisabled={importBusy !== null || confirmBlocking}
              onPress={() => closeFlow()}
            >
              Cancel
            </AppButton>
          )}
          {showFooterHoldingsSummary ? (
            <span className="csv-import-summary csv-import-summary--footer">
              {postReviewStep === "diff" && importDiff
                ? `${importDiff.counts.updated} updated · ${importDiff.counts.added} added · ${importDiff.counts.unchanged} unchanged`
                : isAccountMappingStep
                  ? holdingsCountLabel
                  : `${holdingsRowCount} holdings found`}
            </span>
          ) : hideCancelButton ? null : (
            <span />
          )}
          <div className="csv-import-modal__footer-actions">
            {postReviewStep !== "review" &&
            pending &&
            pending.parsed.rows.length > 0 &&
            !parseError &&
            confirmOverlay.mode !== "error" ? (
              <AppButton
                size="sm"
                variant="ghost"
                isDisabled={importBusy !== null || confirmBlocking}
                onPress={() => onBackFromPostReview()}
              >
                Back
              </AppButton>
            ) : null}
            {confirmOverlay.mode === "error" ? (
              <AppButton
                size="sm"
                variant="primary"
                onPress={() => setConfirmOverlay({ mode: "idle" })}
              >
                Dismiss
              </AppButton>
            ) : (
              <AppButton
                size="sm"
                variant="primary"
                isDisabled={
                  !primaryFooterEnabled ||
                  importBusy !== null ||
                  confirmBlocking
                }
                onPress={() => onPrimaryFooterPress()}
              >
                {primaryFooterLabel}
              </AppButton>
            )}
          </div>
        </div>
      </footer>
    </div>
  );

  const busyOverlay = importBusy ? (
    <div
      className={`csv-import-busy-overlay${isPanel ? " csv-import-busy-overlay--panel" : " csv-import-busy-overlay--modal"}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="csv-import-busy-card">
        <div className="csv-import-busy-ring" aria-hidden />
        <p className="csv-import-busy-headline">{importBusy.headline}</p>
        <ul className="csv-import-busy-details">
          {importBusy.details.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  ) : null;

  return (
    <>
      {!hideTrigger && !isPanel ? (
        <div
          className={
            variant === "toolbar"
              ? "csv-import-root csv-import-root--toolbar"
              : "csv-import-root"
          }
        >
          <div className="csv-import-trigger">
            <AppButton
              size="sm"
              variant="secondary"
              className="csv-import-file-btn"
              onPress={openFlow}
            >
              Import CSV
            </AppButton>
          </div>
        </div>
      ) : null}
      {flowOpen && isPanel ? (
        <div
          className={`csv-import-panel-host${importFlowExiting ? " csv-import-panel-host--exiting" : ""}`}
        >
          {busyOverlay}
          {flowShell}
        </div>
      ) : null}
      {flowOpen && !isPanel && typeof document !== "undefined"
        ? createPortal(
            <div
              className={`csv-import-modal-overlay${modalClosing ? " csv-import-modal-overlay--closing" : ""}`}
              role="presentation"
              onAnimationEnd={onModalOverlayAnimationEnd}
              onClick={() => {
                if (!importBusy && confirmOverlay.mode === "idle") closeFlow();
              }}
            >
              <div
                className="csv-import-modal-stack"
                onClick={(e) => e.stopPropagation()}
              >
                {busyOverlay}
                {flowShell}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
