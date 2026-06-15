import { type RefObject } from "react";
import {
  IconArrowNarrowLeftDashed,
  IconCircleCheck,
  IconCircleOpenArrowRight,
  IconSparkles,
} from "@tabler/icons-react";
import { BudgetExplorationHero } from "./BudgetExplorationHero";
import { WtrIncomeToolbarMapSelects } from "./WtrIncomeToolbarMapSelects";
import { WtrMapFilterButton } from "./WtrMapFilterButton";
import { WtrFitScoreHelpPopout } from "./WtrFitScoreHelpPopout";
import { applyMapFiltersBudgetPreferences } from "../../lib/whereToRetire/cityMapScoring";
import type { MapFilters } from "../../lib/whereToRetire/cityMapScoring";
import type { MapPinColorView } from "../../lib/whereToRetire/mapPinDisplay";
import { Card } from "../ui/Card";
import { IntensitySelector } from "./IntensitySelector";
import "./WtrFiltersSidebar.scss";

type Props = {
  planMonthlyIncome: number;
  explorationIncome: number;
  onExplorationIncomeChange: (income: number) => void;
  pinColorView: MapPinColorView;
  onPinColorViewChange: (view: MapPinColorView) => void;
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
  activeFilterCount: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  filterButtonRef: RefObject<HTMLButtonElement | null>;
  onOpenBudgetTab: () => void;
  onOpenPreferences?: () => void;
  onClosePreferences?: () => void;
  preferencesOpen?: boolean;
  preferencesUpdatedFlash?: boolean;
};

export function WtrFiltersSidebar({
  planMonthlyIncome,
  explorationIncome,
  onExplorationIncomeChange,
  pinColorView,
  onPinColorViewChange,
  filters,
  onFiltersChange,
  activeFilterCount,
  filtersOpen,
  onToggleFilters,
  filterButtonRef,
  onOpenBudgetTab,
  onOpenPreferences,
  onClosePreferences,
  preferencesOpen = false,
  preferencesUpdatedFlash = false,
}: Props) {
  return (
    <div className="wtr-filters-sidebar">
      <div className="wtr-filters-sidebar__main">
        <div className="wtr-filters-sidebar__intro">
          <div className="wtr-filters-sidebar__intro-row">
            <div className="wtr-filters-sidebar__intro-copy">
              <BudgetExplorationHero
                section="intro"
                planMonthlyIncome={planMonthlyIncome}
                explorationIncome={explorationIncome}
                onExplorationIncomeChange={onExplorationIncomeChange}
              />
            </div>
            <div className="wtr-filters-sidebar__intro-actions">
              <WtrMapFilterButton
                ref={filterButtonRef}
                active={activeFilterCount > 0}
                activeFilterCount={activeFilterCount}
                filtersOpen={filtersOpen}
                onToggle={onToggleFilters}
                compact
              />
            </div>
          </div>
        </div>

        <section
          className="wtr-filters-sidebar__slider"
          aria-labelledby="wtr-budget-adjust-label"
        >
          <Card className="wtr-filters-sidebar__slider-card">
            <div className="wtr-filters-sidebar__slider-header">
              <h2
                id="wtr-budget-adjust-label"
                className="wtr-filters-sidebar__slider-label"
              >
                Need cushion - or restraint? Adjust your budget
              </h2>
              <p className="wtr-filters-sidebar__slider-helper font-xs">
                This won&apos;t change your projected retirement income above — it
                just adjusts what counts as a comfortable budget for the
                destinations below.
              </p>
            </div>
            <BudgetExplorationHero
              section="slider-rail"
              planMonthlyIncome={planMonthlyIncome}
              explorationIncome={explorationIncome}
              onExplorationIncomeChange={onExplorationIncomeChange}
            />
          </Card>
        </section>

        <section
          className="wtr-filters-sidebar__intensity"
          aria-labelledby="wtr-spending-level-label"
        >
          <Card className="wtr-filters-sidebar__intensity-card">
            <p
              id="wtr-spending-level-label"
              className="wtr-filters-sidebar__intensity-label"
            >
              What is your spending level?
            </p>
            <IntensitySelector
              variant="compact"
              value={filters.budgetPreferences.intensity}
              onChange={(intensity) =>
                onFiltersChange(
                  applyMapFiltersBudgetPreferences(filters, {
                    ...filters.budgetPreferences,
                    intensity,
                  }),
                )
              }
            />
            <div className="wtr-filters-sidebar__intensity-footer">
              <button
                type="button"
                className="wtr-filters-sidebar__intensity-budget-link font-xs"
                onClick={onOpenBudgetTab}
              >
                Budget settings
                <IconCircleOpenArrowRight size={14} stroke={1.5} aria-hidden />
              </button>
            </div>
          </Card>
        </section>

        <div className="wtr-filters-sidebar__map-controls">
          <div className="wtr-filters-sidebar__selects">
            <WtrIncomeToolbarMapSelects
              pinColorView={pinColorView}
              onPinColorViewChange={onPinColorViewChange}
              filters={filters}
              onFiltersChange={onFiltersChange}
            />
          </div>

          {onOpenPreferences ? (
            <div className="wtr-filters-sidebar__preferences-wrap">
              <div className="wtr-filters-sidebar__preferences-panel">
                <div className="wtr-filters-sidebar__preferences-cta">
                  <div className="wtr-filters-sidebar__preferences-row">
                    <button
                      type="button"
                      className={[
                        "wtr-filters-sidebar__preferences-btn",
                        preferencesOpen && "wtr-filters-sidebar__preferences-btn--open",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-expanded={preferencesOpen}
                      onClick={
                        preferencesOpen ? onClosePreferences : onOpenPreferences
                      }
                    >
                      <span
                        className="wtr-filters-sidebar__preferences-btn-icon"
                        aria-hidden={!preferencesOpen}
                      >
                        <IconArrowNarrowLeftDashed size={18} stroke={1.5} />
                      </span>
                      <span className="wtr-filters-sidebar__preferences-btn-copy">
                        <span className="wtr-filters-sidebar__preferences-btn-eyebrow font-xs">
                          My retirement fit score
                        </span>
                        <span className="wtr-filters-sidebar__preferences-btn-label">
                          Update my preferences
                        </span>
                      </span>
                    </button>
                    <WtrFitScoreHelpPopout />
                  </div>
                </div>
                {preferencesUpdatedFlash ? (
                  <div
                    className="wtr-filters-sidebar__prefs-success-flash"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="wtr-filters-sidebar__prefs-success-card">
                      <div
                        className="wtr-filters-sidebar__prefs-success-icon-wrap"
                        aria-hidden
                      >
                        <IconCircleCheck size={28} stroke={1.5} />
                      </div>
                      <p className="wtr-filters-sidebar__prefs-success-eyebrow">
                        <IconSparkles size={14} stroke={1.5} aria-hidden />
                        Travel Priorities saved
                      </p>
                      <h3 className="wtr-filters-sidebar__prefs-success-title">
                        Your map is personalized
                      </h3>
                      <p className="wtr-filters-sidebar__prefs-success-copy">
                        Fit scores and pin colors now reflect what matters most
                        to you.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="wtr-filters-sidebar__footer font-xs" role="note">
        All figures are educational estimates only — not tax, legal, financial, or
        immigration advice. Consult qualified professionals before relocating. Sources:{" "}
        <a
          href="https://www.irs.gov/individuals/international-taxpayers"
          target="_blank"
          rel="noopener noreferrer"
        >
          IRS
        </a>
        {" · "}
        <a
          href="https://taxfoundation.org/data/all/state/state-income-tax-rates/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Tax Foundation
        </a>
      </footer>
    </div>
  );
}
