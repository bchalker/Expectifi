import { IconPlus, IconX } from '@tabler/icons-react'
import { ListBox, Select } from '@heroui/react'
import { fmtInput, parseNum } from '../utils/format'
import {
  canAddOnboardingAccountEntry,
  getAccountTypeMeta,
  getOnboardingAccountTypeOptionsForEntry,
  newManualAccountEntry,
  type ManualAccountEntry,
  type OnboardingAccountType,
} from '../lib/manualAccountEntries'
import { firstKeyFromSelectSelection } from '../lib/dateOfBirthSelect'
import './OnboardingAccountsStep.scss'
import './OnboardingFieldShell.scss'

type Props = {
  entries: ManualAccountEntry[]
  onChange: (entries: ManualAccountEntry[]) => void
  validationError?: string | null
}

export function OnboardingAccountsStep({ entries, onChange, validationError }: Props) {
  const canAddAnother = canAddOnboardingAccountEntry(entries)

  function updateEntry(id: string, patch: Partial<ManualAccountEntry>) {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function removeEntry(id: string) {
    if (entries.length <= 1) return
    onChange(entries.filter((e) => e.id !== id))
  }

  function addEntry() {
    if (!canAddOnboardingAccountEntry(entries)) return
    onChange([...entries, newManualAccountEntry()])
  }

  return (
    <div className="onboarding-accounts-step">
      <div className="onboarding-accounts-step__header-row">
        <span className="onboarding-accounts-step__column-label" id="onboarding-acct-type-header">
          Account type
        </span>
        <div className="onboarding-accounts-step__balance-header">
          <span
            className="onboarding-accounts-step__balance-prefix onboarding-accounts-step__balance-prefix--spacer"
            aria-hidden
          >
            $
          </span>
          <span className="onboarding-accounts-step__column-label" id="onboarding-acct-balance-header">
            Balance
          </span>
          {entries.length > 1 ? (
            <span className="onboarding-accounts-step__remove-spacer" aria-hidden />
          ) : null}
        </div>
      </div>

      <div className="onboarding-accounts-step__rows">
        {entries.map((entry) => {
          const typeSelected = entry.type != null
          const meta = entry.type != null ? getAccountTypeMeta(entry.type) : null
          const filled = entry.balance > 0
          const typeOptions = getOnboardingAccountTypeOptionsForEntry(entries, entry.id)
          return (
            <div key={entry.id} className="onboarding-accounts-step__row">
              <div className="onboarding-accounts-step__row-fields">
                <div className="onboarding-accounts-step__type-field">
                  <Select
                    className={[
                      'onboarding-accounts-step__type-select',
                      typeSelected ? 'onboarding-accounts-step__type-select--filled' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    variant="secondary"
                    placeholder="Select account type"
                    aria-labelledby="onboarding-acct-type-header"
                    selectedKey={entry.type}
                    onSelectionChange={(keys) => {
                      const id = firstKeyFromSelectSelection(keys)
                      if (!id) return
                      updateEntry(entry.id, { type: id as OnboardingAccountType })
                    }}
                  >
                    <Select.Trigger>
                      <Select.Value>
                        {meta ? (
                          <span className="onboarding-accounts-step__type-trigger-value">
                            <span className="onboarding-accounts-step__type-trigger-label">{meta.label}</span>
                            {meta.taxHelper ? (
                              <span className="onboarding-accounts-step__type-trigger-helper">{meta.taxHelper}</span>
                            ) : null}
                          </span>
                        ) : null}
                      </Select.Value>
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className="app-select-import-menu__popover">
                      <ListBox className="app-select-import-menu__list">
                        {typeOptions.map((opt) => (
                          <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                            <span className="onboarding-accounts-step__type-option">
                              <span className="onboarding-accounts-step__type-option-label">{opt.label}</span>
                              {opt.taxHelper ? (
                                <span className="onboarding-accounts-step__type-option-helper">{opt.taxHelper}</span>
                              ) : null}
                            </span>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                <div className="onboarding-accounts-step__balance-field">
                  <div className="onboarding-accounts-step__balance-row">
                    <span className="onboarding-accounts-step__balance-prefix">$</span>
                    <div
                      className={[
                        'onboarding-field-shell',
                        'onboarding-accounts-step__balance-wrap',
                        filled ? 'onboarding-field-shell--filled' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <input
                        id={`acct-balance-${entry.id}`}
                        type="text"
                        inputMode="decimal"
                        aria-labelledby="onboarding-acct-balance-header"
                        className="onboarding-field-shell__input onboarding-accounts-step__balance-input"
                        value={entry.balance > 0 ? fmtInput(entry.balance) : ''}
                        placeholder="0"
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d,]/g, '')
                          updateEntry(entry.id, { balance: Math.max(0, Math.round(parseNum(raw))) })
                        }}
                        onBlur={(e) => {
                          updateEntry(entry.id, { balance: Math.max(0, Math.round(parseNum(e.target.value))) })
                        }}
                      />
                    </div>
                    {entries.length > 1 ? (
                      <button
                        type="button"
                        className="onboarding-accounts-step__remove"
                        aria-label={meta ? `Remove ${meta.label} account` : 'Remove account row'}
                        onClick={() => removeEntry(entry.id)}
                      >
                        <IconX size={16} stroke={1.5} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {canAddAnother ? (
        <button type="button" className="onboarding-accounts-step__add" onClick={addEntry}>
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
  )
}

export function hasValidManualAccountEntries(entries: ManualAccountEntry[]): boolean {
  return entries.some((entry) => entry.type != null && entry.balance > 0)
}

export function normalizedManualAccountEntries(entries: ManualAccountEntry[]): ManualAccountEntry[] {
  return entries
    .filter((entry) => entry.type != null && entry.balance > 0)
    .map((entry) => ({ ...entry, type: entry.type as OnboardingAccountType, balance: Math.round(entry.balance) }))
}
