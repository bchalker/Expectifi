import { useCallback, useEffect, useMemo, useState } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { ComparisonGrid } from "../components/whereToRetire/ComparisonGrid";
import { DestinationSearch } from "../components/whereToRetire/DestinationSearch";
import { PreferenceOverlay } from "../components/whereToRetire/PreferenceOverlay";
import { PreferencePanel } from "../components/whereToRetire/PreferencePanel";
import { RecommendationChips } from "../components/whereToRetire/RecommendationChips";
import type { DestinationCatalogEntry } from "../data/destinations";
import type { ComputedSnapshot } from "../lib/computeResults";
import {
  getTopRecommendations,
  scoreDestinations,
} from "../lib/destinationScorer";
import { APP_DASHBOARD_PATH, navigateApp } from "../lib/appPaths";
import {
  hasCompletedPreferences,
  loadPreferences,
  type WtrPreferences,
} from "../lib/whereToRetire/preferences";
import {
  dedupeDestinationKeys,
  loadDestinationState,
  markKeyManual,
  setAutoPopulatedKeys,
  type StoredDestinationState,
} from "../lib/whereToRetire/storage";
import "./WhereToRetire.scss";

type Props = {
  c: ComputedSnapshot;
};

function applyTopRecommendations(
  prefs: WtrPreferences,
  grossMonthlyIncome: number,
  prev: StoredDestinationState,
  autoCount = 3,
): StoredDestinationState {
  const manualKeys = prev.manualKeys.filter((k) => prev.keys.includes(k));
  const exclude = new Set(manualKeys);
  const top = getTopRecommendations(
    prefs,
    grossMonthlyIncome,
    autoCount,
    exclude,
  );
  const autoKeys = top.map((t) => t.key);
  const keys = dedupeDestinationKeys([...manualKeys, ...autoKeys]);
  return { keys, manualKeys, autoKeys };
}

export function WhereToRetire({ c }: Props) {
  const grossMonthlyIncome = c.grossMon;

  const [prefs, setPrefs] = useState<WtrPreferences | null>(() =>
    loadPreferences(),
  );
  const [showOverlay, setShowOverlay] = useState(
    () => !hasCompletedPreferences(),
  );
  const [prefPanelOpen, setPrefPanelOpen] = useState(false);

  const [destState, setDestState] = useState<StoredDestinationState>(() =>
    loadDestinationState(),
  );

  const scored = useMemo(
    () =>
      scoreDestinations(
        prefs ?? {
          completed: true,
          skipped: true,
          regionScope: "both",
          priorities: [],
          dealbreakers: [],
        },
        grossMonthlyIncome,
      ),
    [prefs, grossMonthlyIncome],
  );

  const scoreByKey = useMemo(() => {
    const map: Record<string, { topReason: string }> = {};
    for (const s of scored) {
      map[s.key] = { topReason: s.topReason };
    }
    return map;
  }, [scored]);

  const recommendedCount = useMemo(() => {
    if (!prefs || prefs.skipped) return 0;
    return scored.length;
  }, [prefs, scored.length]);

  const chipDestinations = useMemo(() => {
    const inGrid = new Set(destState.keys);
    return scored.filter((s) => !inGrid.has(s.key));
  }, [scored, destState.keys]);

  const handlePrefsComplete = useCallback(
    (nextPrefs: WtrPreferences) => {
      setPrefs(nextPrefs);
      setShowOverlay(false);
      setDestState((prev) => {
        const next = applyTopRecommendations(
          nextPrefs,
          grossMonthlyIncome,
          prev,
        );
        setAutoPopulatedKeys(next.autoKeys, next.manualKeys);
        return next;
      });
    },
    [grossMonthlyIncome],
  );

  const handlePrefsSave = useCallback(
    (nextPrefs: WtrPreferences) => {
      setPrefs(nextPrefs);
      setDestState((prev) => {
        const next = applyTopRecommendations(
          nextPrefs,
          grossMonthlyIncome,
          prev,
        );
        setAutoPopulatedKeys(next.autoKeys, next.manualKeys);
        return next;
      });
    },
    [grossMonthlyIncome],
  );

  const persistState = useCallback((state: StoredDestinationState) => {
    setDestState(state);
    setAutoPopulatedKeys(state.autoKeys, state.manualKeys);
  }, []);

  useEffect(() => {
    if (showOverlay || !prefs) return;
    if (destState.keys.length > 0) return;
    const next = applyTopRecommendations(prefs, grossMonthlyIncome, destState);
    persistState(next);
  }, [showOverlay, prefs, grossMonthlyIncome, destState, persistState]);

  const onRemove = useCallback(
    (key: string) => {
      const manualKeys = destState.manualKeys.filter((k) => k !== key);
      const autoKeys = destState.autoKeys.filter((k) => k !== key);
      const keys = destState.keys.filter((k) => k !== key);
      persistState({ keys, manualKeys, autoKeys });
    },
    [destState, persistState],
  );

  const addDestination = useCallback(
    (entry: DestinationCatalogEntry, fromManual = true) => {
      if (destState.keys.includes(entry.key)) return;

      const manualKeys = fromManual
        ? [...destState.manualKeys, entry.key]
        : destState.manualKeys;
      const autoKeys = fromManual
        ? destState.autoKeys
        : [...destState.autoKeys, entry.key];
      const keys = dedupeDestinationKeys([...destState.keys, entry.key]);
      persistState({ keys, manualKeys, autoKeys });
      if (fromManual) markKeyManual(entry.key);
    },
    [destState, persistState],
  );

  const onAddFromSearch = useCallback(
    (entry: DestinationCatalogEntry) => addDestination(entry, true),
    [addDestination],
  );

  const onAddFromChip = useCallback(
    (key: string) => {
      const entry = scored.find((s) => s.key === key)?.entry;
      if (entry) addDestination(entry, false);
    },
    [addDestination, scored],
  );

  return (
    <div className="where-to-retire">
      {showOverlay ? (
        <PreferenceOverlay
          onComplete={handlePrefsComplete}
          onSkip={handlePrefsComplete}
        />
      ) : null}

      <div className="where-to-retire__body main app-page app-page--where-to-retire">
        <button
          type="button"
          className="app-page-back"
          onClick={() => navigateApp(APP_DASHBOARD_PATH)}
        >
          <IconArrowLeft size={16} stroke={1.5} aria-hidden />
          Back to dashboard
        </button>

        <h1 className="where-to-retire__title">
          Where can you live on your retirement income?
        </h1>

        <section
          className="where-to-retire__discover"
          aria-label="Recommended destinations and search"
        >
          <div className="where-to-retire__prefs-row">
            <div className="where-to-retire__prefs-copy">
              <h2 className="where-to-retire__prefs-heading">
                {prefs && !prefs.skipped ? (
                  <>
                    There are{" "}
                    <span className="where-to-retire__prefs-count">
                      {recommendedCount} recommended
                    </span>{" "}
                    locations that best fit your preferences
                  </>
                ) : (
                  "Set your preferences to see recommended locations"
                )}
              </h2>
            </div>
            <button
              type="button"
              className="where-to-retire__prefs-pill"
              onClick={() => setPrefPanelOpen(true)}
            >
              {prefs && !prefs.skipped ? "Edit preferences" : "Set preferences"}
            </button>
          </div>
          <RecommendationChips chips={chipDestinations} onAdd={onAddFromChip} />
          <DestinationSearch
            selectedKeys={destState.keys}
            preferences={prefs}
            grossMonthlyIncome={grossMonthlyIncome}
            onAdd={onAddFromSearch}
          />
        </section>

        <ComparisonGrid
          selectedKeys={destState.keys}
          grossMonthlyIncome={grossMonthlyIncome}
          scoreByKey={scoreByKey}
          onRemove={onRemove}
        />

        <p className="where-to-retire__disclaimer" role="note">
          All figures are educational estimates only — not tax, legal,
          financial, or immigration advice. Consult qualified professionals
          before relocating. Sources:{' '}
          <a
            href="https://www.irs.gov/individuals/international-taxpayers"
            target="_blank"
            rel="noopener noreferrer"
          >
            IRS
          </a>
          {' · '}
          <a
            href="https://taxfoundation.org/data/all/state/state-income-tax-rates/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tax Foundation
          </a>
        </p>
      </div>

      <PreferencePanel
        open={prefPanelOpen}
        onClose={() => setPrefPanelOpen(false)}
        onSave={handlePrefsSave}
      />
    </div>
  );
}
