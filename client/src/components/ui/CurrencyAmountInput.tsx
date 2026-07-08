import { useState, type ReactNode } from "react";
import { Input, TextField } from "@heroui/react";
import { IconCheck } from "@tabler/icons-react";
import { currencySymbol } from "../../lib/displayCurrency";
import { fmt, fmtInput, parseNum } from "../../utils/format";
import "./CurrencyAmountInput.scss";
import "../OnboardingFieldShell.scss";

type Props = {
  id: string;
  label: string;
  value: number;
  onChange: (amount: number) => void;
  /** When true, show annual equivalent beneath the field. */
  showAnnualEquivalent?: boolean;
  /** When true, value is already annual — hint shows $X/year without multiplying. */
  valueIsAnnual?: boolean;
  /** Warm helper copy beneath the field. */
  hint?: ReactNode;
  className?: string;
  disabled?: boolean;
  /** When true, show value as read-only text instead of an input. */
  readOnly?: boolean;
  /** When true, render the $ prefix outside the input box (sibling to the left). */
  externalPrefix?: boolean;
  /** Optional suffix outside the input box (e.g. "/mo"). */
  externalSuffix?: string;
  /** Optional suffix inside the onboarding field shell (e.g. "/mo"). */
  internalSuffix?: string;
  /** Muted suffix appended to the visible label (e.g. "— optional"). */
  labelMutedSuffix?: string;
  /** Example-scale copy shown when value is 0 (field stays empty until the user types). */
  placeholder?: string;
  /** Welcome/onboarding: grey when empty, white + checkmark when value > 0. */
  showFillState?: boolean;
  /** Validation message; when set, marks the field invalid. */
  error?: string;
  /** `message` — error copy below the field; `label` — red label only (message stays for screen readers). */
  errorVariant?: "message" | "label";
  /** Optional benchmark badge beside the label (e.g. national average). */
  averageBadge?: string | null;
  /** Keep label for screen readers only (no visible label row). */
  hideLabel?: boolean;
};

export function CurrencyAmountInput({
  id,
  label,
  value,
  onChange,
  showAnnualEquivalent = false,
  valueIsAnnual = false,
  hint,
  className,
  disabled = false,
  readOnly = false,
  externalPrefix = false,
  externalSuffix,
  internalSuffix,
  labelMutedSuffix,
  placeholder,
  showFillState = false,
  error,
  errorVariant = "message",
  averageBadge,
  hideLabel = false,
}: Props) {
  const [focused, setFocused] = useState(false);
  const invalid = Boolean(error);
  const labelOnlyError = invalid && errorVariant === "label";
  const showPlaceholder = placeholder != null && value === 0;
  const filled = showFillState && value > 0;
  const prefix = currencySymbol();
  const display = showPlaceholder
    ? ""
    : focused
      ? fmtInput(value)
      : fmtInput(value);

  if (readOnly) {
    const readonlyValue = fmtInput(value);
    const readonlyBody = showFillState ? (
      <div
        className={[
          "onboarding-field-shell",
          "onboarding-field-shell--readonly",
          filled ? "onboarding-field-shell--filled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <p
          className="onboarding-field-shell__readonly-value"
          aria-labelledby={id}
        >
          {externalPrefix ? readonlyValue : fmt(value)}
        </p>
        {filled ? (
          <span className="onboarding-field-shell__check" aria-hidden>
            <IconCheck size={14} strokeWidth={2} />
          </span>
        ) : null}
      </div>
    ) : (
      <p className="currency-amount-input__readonly-value" aria-labelledby={id}>
        {externalPrefix ? readonlyValue : fmt(value)}
      </p>
    );

    return (
      <div
        className={[
          "currency-amount-input",
          "currency-amount-input--readonly",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="currency-amount-input__label" id={id}>
          {label}
        </span>
        {externalPrefix || externalSuffix ? (
          <div className="currency-amount-input__value-group">
            <div className="currency-amount-input__amount-row currency-amount-input__amount-row--external-affixes">
              <span className="currency-amount-input__prefix-outside">
                {prefix}
              </span>
              {readonlyBody}
              {externalSuffix ? (
                <span className="currency-amount-input__suffix-outside">
                  {externalSuffix}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          readonlyBody
        )}
        {hint ? <p className="currency-amount-input__hint">{hint}</p> : null}
      </div>
    );
  }

  const annualHint = showAnnualEquivalent ? (
    <p
      className={[
        "currency-amount-input__annual-hint",
        value > 0 ? "currency-amount-input__annual-hint--visible" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={value <= 0}
    >
      {fmt(Math.round(value) * 12)}
      /year
    </p>
  ) : valueIsAnnual ? (
    <p
      className={[
        "currency-amount-input__annual-hint",
        value > 0 ? "currency-amount-input__annual-hint--visible" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={value <= 0}
    >
      {fmt(Math.round(value))}/year
    </p>
  ) : null;

  const amountRow = (
    <div
      className={[
        "currency-amount-input__amount-row",
        externalPrefix || externalSuffix
          ? "currency-amount-input__amount-row--external-affixes"
          : "",
        externalPrefix
          ? "currency-amount-input__amount-row--external-prefix"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {externalPrefix ? (
        <span className="currency-amount-input__prefix-outside">{prefix}</span>
      ) : null}
      {showFillState ? (
        <div
          className={[
            "onboarding-field-shell",
            "currency-amount-input__wrap",
            filled ? "onboarding-field-shell--filled" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {!externalPrefix ? (
            <span className="num-input-prefix">{prefix}</span>
          ) : null}
          <TextField
            className={[
              "currency-amount-input__text-field",
              "currency-amount-input__text-field--onboarding",
            ]
              .filter(Boolean)
              .join(" ")}
            variant="secondary"
            aria-label={hideLabel ? label : undefined}
            value={display}
            onChange={(v) => onChange(Math.round(parseNum(v)))}
            isDisabled={disabled}
            isInvalid={invalid}
          >
            <Input
              id={id}
              type="text"
              inputMode="decimal"
              className="onboarding-field-shell__input currency-amount-input__field"
              placeholder={placeholder}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onChange(Math.round(parseNum(display)));
              }}
            />
          </TextField>
          {internalSuffix ? (
            <span className="currency-amount-input__suffix-inside">
              {internalSuffix}
            </span>
          ) : null}
          {filled ? (
            <span className="onboarding-field-shell__check" aria-hidden>
              <IconCheck size={14} strokeWidth={2} />
            </span>
          ) : null}
        </div>
      ) : externalPrefix ? (
        <TextField
          className="currency-amount-input__text-field"
          variant="secondary"
          fullWidth
          aria-label={hideLabel ? label : undefined}
          value={display}
          onChange={(v) => onChange(Math.round(parseNum(v)))}
          isDisabled={disabled}
          isInvalid={invalid}
        >
          <Input
            id={id}
            type="text"
            inputMode="decimal"
            className="currency-amount-input__field"
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              onChange(Math.round(parseNum(display)));
            }}
          />
        </TextField>
      ) : (
        <div className="num-input-wrap currency-amount-input__wrap">
          <span className="num-input-prefix">{prefix}</span>
          <TextField
            className="currency-amount-input__text-field"
            variant="secondary"
            aria-label={hideLabel ? label : undefined}
            value={display}
            onChange={(v) => onChange(Math.round(parseNum(v)))}
            isDisabled={disabled}
            isInvalid={invalid}
          >
            <Input
              id={id}
              type="text"
              inputMode="decimal"
              className="num-input currency-amount-input__field"
              placeholder={placeholder}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onChange(Math.round(parseNum(display)));
              }}
            />
          </TextField>
          {internalSuffix ? (
            <span className="currency-amount-input__suffix-inside">
              {internalSuffix}
            </span>
          ) : null}
        </div>
      )}
      {externalSuffix ? (
        <span className="currency-amount-input__suffix-outside">
          {externalSuffix}
        </span>
      ) : null}
    </div>
  );

  const labelRow = (
    <div className="currency-amount-input__label-row">
      <label
        className={[
          "currency-amount-input__label",
          labelOnlyError ? "currency-amount-input__label--error" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        htmlFor={id}
      >
        {label}
        {labelMutedSuffix ? (
          <span className="currency-amount-input__label-muted"> {labelMutedSuffix}</span>
        ) : null}
      </label>
      {averageBadge ? (
        <span className="currency-amount-input__average-badge">
          {averageBadge}
        </span>
      ) : null}
    </div>
  );

  return (
    <div
      className={[
        "currency-amount-input",
        labelOnlyError ? "currency-amount-input--label-error" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hideLabel ? (
        <label className="currency-amount-input__sr-only" htmlFor={id}>
          {label}
        </label>
      ) : (
        labelRow
      )}
      {externalPrefix || externalSuffix ? (
        <div className="currency-amount-input__value-group">
          {amountRow}
          {annualHint}
        </div>
      ) : (
        <>
          {amountRow}
          {annualHint}
        </>
      )}
      {error && !labelOnlyError ? (
        <p className="currency-amount-input__error" role="alert">
          {error}
        </p>
      ) : null}
      {labelOnlyError ? (
        <span className="currency-amount-input__sr-only" role="alert">
          {error}
        </span>
      ) : null}
      {hint ? <p className="currency-amount-input__hint">{hint}</p> : null}
    </div>
  );
}
