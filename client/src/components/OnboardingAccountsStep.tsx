import { useMemo } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";
import { AppSelect } from "./ui/AppSelect";
import { fmtInput, parseNum } from "../utils/format";
import { currencySymbol } from "../lib/displayCurrency";
import {
  canAddOnboardingAccountEntry,
  getAccountTypeMeta,
  getOnboardingAccountTypeOptionsForEntry,
  newManualAccountEntry,
  type ManualAccountEntry,
  type OnboardingAccountType,
} from "../lib/manualAccountEntries";
import type { OnboardingRegionId } from "../lib/onboardingRegions";
import { resolveOnboardingAccountLocale } from "../lib/onboardingAccountTypesByLocale";
import { ManualAccountAllocationSlider } from "./ManualAccountAllocationSlider";
import "./OnboardingAccountsStep.scss";
import "./OnboardingFieldShell.scss";
import "./ManualAccountAllocationSlider.scss";

type Props = {
  /** Region from step 1 — drives account type labels in the dropdown. */
  accountLocale?: OnboardingRegionId | null;
  entries: ManualAccountEntry[];
  onChange: (entries: ManualAccountEntry[]) => void;
  validationError?: string | null;
};

export function OnboardingAccountsStep({
  accountLocale: accountLocaleProp,
  entries,
  onChange,
  validationError,
}: Props) {
  const accountLocale = useMemo(
    () => accountLocaleProp ?? resolveOnboardingAccountLocale(),
    [accountLocaleProp],
  );
  const canAddAnother = canAddOnboardingAccountEntry(entries, accountLocale);

  function updateEntry(id: string, patch: Partial<ManualAccountEntry>) {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeEntry(id: string) {
    if (entries.length <= 1) {
      onChange([newManualAccountEntry(null)]);
      return;
    }
    onChange(entries.filter((e) => e.id !== id));
  }

  function addEntry() {
    if (!canAddOnboardingAccountEntry(entries, accountLocale)) return;
    onChange([...entries, newManualAccountEntry(null)]);
  }

  return (
    <div className="onboarding-accounts-step">
      <div className="onboarding-accounts-step__header-row">
        <span
          className="onboarding-accounts-step__column-label"
          id="onboarding-acct-type-header"
        >
          Account type
        </span>
        <div className="onboarding-accounts-step__balance-header">
          <span
            className="onboarding-accounts-step__balance-prefix onboarding-accounts-step__balance-prefix--spacer"
            aria-hidden
          >
            {currencySymbol()}
          </span>
          <span
            className="onboarding-accounts-step__column-label"
            id="onboarding-acct-balance-header"
          >
            Balance
          </span>
          {entries.length > 1 ? (
            <span
              className="onboarding-accounts-step__remove-spacer"
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      <div className="onboarding-accounts-step__rows">
        {entries.map((entry) => {
          const typeSelected = entry.type != null;
          const meta =
            entry.type != null ? getAccountTypeMeta(entry.type, accountLocale) : null;
          const filled = entry.balance > 0;
          const typeOptions = getOnboardingAccountTypeOptionsForEntry(
            entries,
            entry.id,
            accountLocale,
          );
          return (
            <div key={entry.id} className="onboarding-accounts-step__row">
              <div className="onboarding-accounts-step__row-fields">
                <div className="onboarding-accounts-step__type-field">
                  <AppSelect
                    className={[
                      "onboarding-accounts-step__type-select",
                      typeSelected
                        ? "onboarding-accounts-step__type-select--filled"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    placeholder="Select account type"
                    ariaLabelledBy="onboarding-acct-type-header"
                    value={entry.type}
                    options={typeOptions.map((opt) => ({
                      id: opt.id,
                      label: opt.label,
                    }))}
                    onChange={(id) => {
                      updateEntry(entry.id, {
                        type: id as OnboardingAccountType,
                      });
                    }}
                    popoverPlacement="bottom start"
                    popoverClassName="app-select-import-menu__popover onboarding-accounts-step__type-popover"
                    listClassName="app-select-import-menu__list onboarding-accounts-step__type-list"
                  />
                </div>

                <div className="onboarding-accounts-step__balance-field">
                  <div className="onboarding-accounts-step__balance-row">
                    <span className="onboarding-accounts-step__balance-prefix">
                      {currencySymbol()}
                    </span>
                    <div
                      className={[
                        "onboarding-field-shell",
                        "onboarding-accounts-step__balance-wrap",
                        filled ? "onboarding-field-shell--filled" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <input
                        id={`acct-balance-${entry.id}`}
                        type="text"
                        inputMode="decimal"
                        aria-labelledby="onboarding-acct-balance-header"
                        className="onboarding-field-shell__input onboarding-accounts-step__balance-input"
                        value={
                          entry.balance > 0 ? fmtInput(entry.balance) : ""
                        }
                        placeholder="0"
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d,]/g, "");
                          updateEntry(entry.id, {
                            balance: Math.max(0, Math.round(parseNum(raw))),
                          });
                        }}
                        onBlur={(e) => {
                          updateEntry(entry.id, {
                            balance: Math.max(
                              0,
                              Math.round(parseNum(e.target.value)),
                            ),
                          });
                        }}
                      />
                    </div>
                    {entries.length > 1 ? (
                      <button
                        type="button"
                        className="onboarding-accounts-step__remove"
                        aria-label={
                          meta
                            ? `Remove ${meta.label} account`
                            : "Remove account row"
                        }
                        onClick={() => removeEntry(entry.id)}
                      >
                        <IconX size={16} stroke={1.5} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              {typeSelected ? (
                <ManualAccountAllocationSlider
                  entryId={entry.id}
                  className="onboarding-accounts-step__allocation"
                  value={entry.allocation_profile}
                  equityPct={entry.allocation_equity_pct}
                  onChange={(allocation_profile, allocation_equity_pct) =>
                    updateEntry(entry.id, {
                      allocation_profile,
                      allocation_equity_pct,
                    })
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {canAddAnother ? (
        <button
          type="button"
          className="onboarding-accounts-step__add"
          onClick={addEntry}
        >
          <IconPlus size={14} stroke={1.5} aria-hidden />
          Add another account
        </button>
      ) : null}

      {validationError ? (
        <p className="onboarding-accounts-step__error" role="alert">
          {validationError}
        </p>
      ) : null}
    </div>
  );
}

export function hasValidManualAccountEntries(
  entries: ManualAccountEntry[],
): boolean {
  return entries.some((entry) => entry.type != null && entry.balance > 0);
}

export function normalizedManualAccountEntries(
  entries: ManualAccountEntry[],
): ManualAccountEntry[] {
  return entries
    .filter((entry) => entry.type != null && entry.balance > 0)
    .map((entry) => ({
      ...entry,
      type: entry.type as OnboardingAccountType,
      balance: Math.round(entry.balance),
      source: entry.source ?? "manual",
    }));
}
