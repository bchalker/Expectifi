import { useMemo, useState } from "react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useRetirementPreferences } from "../hooks/useRetirementPreferences";
import { useUserLocale } from "../context/UserLocaleContext";
import {
  computeIncomeHarvestPreview,
  homeCountrySectionTitle,
  previewMapDestinationsForIncome,
  type IncomeHarvestCityRow,
  type IncomeHarvestContextParagraph,
} from "../lib/whereToRetire/incomeHarvestPreview";
import { fmtMon } from "../utils/format";
import { IncomeHarvestPreviewMap } from "./IncomeHarvestPreviewMap";
import { IncomeHarvestPreferencesEntry } from "./IncomeHarvestPreferencesEntry";
import { WhereToRetirePanelEntry } from "./WhereToRetirePanelEntry";
import "./IncomeHarvestPreviewPanel.scss";

const WTR_SCORE_FACTORS =
  "cost of living, quality of life, food prices, healthcare, climate, and tax treatment";

type Props = {
  monthlyIncome: number;
};

function ContextParagraph({
  paragraph,
}: {
  paragraph: IncomeHarvestContextParagraph;
}) {
  if (paragraph.kind === "abroad") {
    return (
      <p className="where-to-retire-preview-panel__context">
        Your income goes further abroad.{" "}
        <span className="where-to-retire-preview-panel__context-emphasis">
          {paragraph.topCityLabel}
        </span>{" "}
        scores {paragraph.scoreDelta} points higher than your best US match. Our
        Where to Retire tool scores each city on {WTR_SCORE_FACTORS} —{" "}
        <span className="where-to-retire-preview-panel__context-emphasis">
          {paragraph.topCityLabel}
        </span>{" "}
        ranks well across all of them at this income level.
      </p>
    );
  }

  if (paragraph.kind === "international") {
    return (
      <p className="where-to-retire-preview-panel__context">
        At{" "}
        <span className="where-to-retire-preview-panel__context-emphasis tabular-nums">
          {fmtMon(paragraph.monthlyIncome)}
        </span>{" "}
        your strongest matches are all international. Our Where to Retire tool
        scores each city on {WTR_SCORE_FACTORS} — explore the full list to find
        your fit.
      </p>
    );
  }

  return (
    <p className="where-to-retire-preview-panel__context">
      Your top domestic matches are competitive with the best worldwide options
      at this income level. Our Where to Retire tool scores each city on{" "}
      {WTR_SCORE_FACTORS} so you can compare your options in detail.
    </p>
  );
}

function CityRows({
  rows,
  mobileMax,
}: {
  rows: IncomeHarvestCityRow[];
  mobileMax: number;
}) {
  if (rows.length === 0) return null;

  return (
    <ul className="where-to-retire-preview-panel__city-list">
      {rows.map((row) => (
        <li
          key={`${row.city}-${row.country}`}
          className={[
            "where-to-retire-preview-panel__city-row",
            row.rank > mobileMax
              ? "where-to-retire-preview-panel__city-row--mobile-hide"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="where-to-retire-preview-panel__city-main">
            <span className="where-to-retire-preview-panel__rank">
              {row.rank}
            </span>
            {row.flag ? (
              <span className="where-to-retire-preview-panel__flag" aria-hidden>
                {row.flag}
              </span>
            ) : null}
            <span className="where-to-retire-preview-panel__city-label">
              {row.label}
            </span>
          </span>
          <span
            className={[
              "where-to-retire-preview-panel__score",
              row.rank === 1 ? "where-to-retire-preview-panel__score--top" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {row.score}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function IncomeHarvestPreviewPanel({ monthlyIncome }: Props) {
  const { locale } = useUserLocale();
  const { prefs, hasSavedPrefs } = useRetirementPreferences();
  const [preferencesWizardOpen, setPreferencesWizardOpen] = useState(false);
  const debouncedIncome = useDebouncedValue(monthlyIncome, 300);
  const hasIncome = debouncedIncome > 0;

  const preview = useMemo(
    () =>
      hasIncome
        ? computeIncomeHarvestPreview(debouncedIncome, locale, prefs)
        : computeIncomeHarvestPreview(0, locale, prefs),
    [debouncedIncome, hasIncome, locale, prefs],
  );

  const mapDestinations = useMemo(
    () => previewMapDestinationsForIncome(debouncedIncome, prefs),
    [debouncedIncome, prefs],
  );

  const showHomeSection =
    hasIncome && preview.dataReady && !preview.homeSectionHidden;

  return (
    <aside
      className="where-to-retire-preview-panel"
      aria-label="Where to Retire preview"
    >
      <header className="where-to-retire-preview-panel__header">
        <h3 className="where-to-retire-preview-panel__title">
          {hasIncome ? (
            <>
              See where your{" "}
              <span className="where-to-retire-preview-panel__title-income tabular-nums">
                {fmtMon(monthlyIncome)}
              </span>{" "}
              takes you
            </>
          ) : (
            <>See where your income takes you</>
          )}
        </h3>
      </header>

      <div className="where-to-retire-preview-panel__main">
        <IncomeHarvestPreviewMap
          destinations={mapDestinations}
          dimmed={!hasIncome}
          loading={mapDestinations.length === 0}
        />

        <section className="where-to-retire-preview-panel__section">
          <h4 className="where-to-retire-preview-panel__section-label">
            Worldwide
          </h4>
          {hasIncome && preview.dataReady ? (
            <CityRows rows={preview.worldwideTop} mobileMax={2} />
          ) : (
            <p className="where-to-retire-preview-panel__income-placeholder">
              Add your retirement income in My Plans to see your matches
            </p>
          )}
        </section>

        {showHomeSection ? (
          <>
            <div
              className="where-to-retire-preview-panel__divider"
              aria-hidden
            />
            <section className="where-to-retire-preview-panel__section">
              <h4 className="where-to-retire-preview-panel__section-label">
                {homeCountrySectionTitle(preview.homeCountryLabel)}
              </h4>
              <CityRows rows={preview.homeTop} mobileMax={2} />
            </section>
          </>
        ) : null}

        {hasIncome && preview.contextParagraph ? (
          <>
            <div
              className="where-to-retire-preview-panel__divider"
              aria-hidden
            />
            <ContextParagraph paragraph={preview.contextParagraph} />
            <IncomeHarvestPreferencesEntry
              hasSavedPrefs={hasSavedPrefs}
              onOpenWizard={() => setPreferencesWizardOpen(true)}
            />
          </>
        ) : null}
      </div>

      <footer className="where-to-retire-preview-panel__footer">
        <WhereToRetirePanelEntry
          monthlyIncome={monthlyIncome}
          preferencesWizardOpen={preferencesWizardOpen}
          onPreferencesWizardOpenChange={setPreferencesWizardOpen}
        />
      </footer>
    </aside>
  );
}
