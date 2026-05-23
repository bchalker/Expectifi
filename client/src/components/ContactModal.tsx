import { type FormEvent, useCallback, useEffect, useState } from "react";
import { IconCircleCheck, IconLoader2 } from "@tabler/icons-react";
import {
  Button,
  CloseButton,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from "@heroui/react";
import { useAuth } from "../context/AuthContext";
import {
  CONTACT_SUBJECTS,
  type ContactSubjectValue,
  submitContactForm,
} from "../lib/api/contact";
import { firstKeyFromSelectSelection } from "../lib/dateOfBirthSelect";
import "./AuthModal.scss";
import "./ContactModal.scss";

const MAX_MESSAGE_LENGTH = 1000;
const SUPPORT_EMAIL = "support@expectifi.com";

type Props = {
  open: boolean;
  onClose: () => void;
};

type FieldErrors = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};

function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

export function ContactModal({ open, onClose }: Props) {
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const isAuthenticated = Boolean(user?.email);

  const resetForm = useCallback(() => {
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setFieldErrors({});
    setSubmitError(null);
    setBusy(false);
    setSuccess(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
    if (loading) return;
    if (user?.email) {
      setEmail(user.email);
      setName(user.displayName?.trim() || "");
    }
  }, [open, loading, user, resetForm]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const validateEmailField = useCallback(() => {
    if (!email.trim()) {
      setFieldErrors((prev) => ({ ...prev, email: "Email is required." }));
      return false;
    }
    if (!isValidEmail(email)) {
      setFieldErrors((prev) => ({
        ...prev,
        email: "Enter a valid email address.",
      }));
      return false;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.email;
      return next;
    });
    return true;
  }, [email]);

  const validateAll = useCallback((): boolean => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "Name is required.";
    if (!email.trim()) errors.email = "Email is required.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
    if (!subject) errors.subject = "Select a topic.";
    if (!message.trim()) errors.message = "Message is required.";
    else if (message.length > MAX_MESSAGE_LENGTH) {
      errors.message = `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, email, subject, message]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validateAll()) return;

    setBusy(true);
    try {
      const result = await submitContactForm({
        name: name.trim(),
        email: email.trim(),
        subject: subject as ContactSubjectValue,
        message: message.trim(),
        userId: user?.id,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      });

      if (result.ok) {
        setSuccess(true);
        return;
      }

      if (result.error === "rate_limited") {
        setSubmitError(
          `Too many messages. Please try again later or email ${SUPPORT_EMAIL} directly.`,
        );
        return;
      }

      if (result.error === "contact_not_configured") {
        setSubmitError(
          "Contact delivery is not configured on this server yet. Please email us directly.",
        );
        return;
      }

      setSubmitError(
        `Something went wrong. Email us directly at ${SUPPORT_EMAIL}`,
      );
    } catch {
      setSubmitError(
        `Something went wrong. Email us directly at ${SUPPORT_EMAIL}`,
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="auth-modal auth-modal--contact"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <button
        type="button"
        className="auth-modal__backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="auth-modal__panel auth-modal__panel--no-footer">
        <header className="auth-modal__header">
          <div className="auth-modal__header-main">
            <h2 id="contact-modal-title" className="auth-modal__title">
              Get in touch
            </h2>
            <p className="auth-modal__subtitle auth-modal__subtitle--in-header">
              We typically respond within one business day.
            </p>
          </div>
          <CloseButton
            className="auth-modal__close"
            aria-label="Close"
            onPress={onClose}
          />
        </header>

        <div className="auth-modal__body">
          {success ? (
            <div className="auth-modal--contact__success">
              <IconCircleCheck
                className="auth-modal--contact__success-icon"
                size={28}
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="auth-modal--contact__success-text">
                Message sent. We&apos;ll be in touch soon.
              </p>
              <div className="auth-modal__actions">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  fullWidth
                  className="auth-modal__primary"
                  onPress={onClose}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <Form
              validationBehavior="native"
              className="auth-modal__form"
              onSubmit={(e) => void onSubmit(e)}
            >
              {isAuthenticated ? (
                <p className="auth-modal__subtitle auth-modal__subtitle--body-only">
                  Sending as {user?.email}
                </p>
              ) : null}

              <TextField
                className="auth-modal__field auth-modal__field--floating"
                fullWidth
                variant="secondary"
                name="name"
                value={name}
                onChange={(v) => {
                  setName(v);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.name;
                    return next;
                  });
                }}
                isRequired
                isReadOnly={isAuthenticated}
              >
                <Label className="auth-modal__label">Name</Label>
                <Input type="text" autoComplete="name" placeholder=" " />
              </TextField>
              {fieldErrors.name ? (
                <p className="auth-modal--contact__field-error">
                  {fieldErrors.name}
                </p>
              ) : null}

              <TextField
                className="auth-modal__field auth-modal__field--floating"
                fullWidth
                variant="secondary"
                name="email"
                value={email}
                onChange={(v) => {
                  if (isAuthenticated) return;
                  setEmail(v);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.email;
                    return next;
                  });
                }}
                isRequired
                isReadOnly={isAuthenticated}
              >
                <Label className="auth-modal__label">Email</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder=" "
                  onBlur={() => {
                    if (email.trim()) validateEmailField();
                  }}
                />
              </TextField>
              {fieldErrors.email ? (
                <p className="auth-modal--contact__field-error">
                  {fieldErrors.email}
                </p>
              ) : null}

              <Select
                className={[
                  "auth-modal__stack-field",
                  subject ? "auth-modal__subject-select--chosen" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                variant="secondary"
                placeholder="Select a topic..."
                aria-label="Subject"
                selectedKey={subject || null}
                onSelectionChange={(keys) => {
                  const id = firstKeyFromSelectSelection(keys);
                  setSubject(id ?? "");
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.subject;
                    return next;
                  });
                }}
              >
                <Label className="auth-modal__stack-label">Subject</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="auth-modal--contact__select-popover">
                  <ListBox className="app-select-import-menu__list">
                    {CONTACT_SUBJECTS.map((opt) => (
                      <ListBox.Item
                        key={opt.value}
                        id={opt.value}
                        textValue={opt.label}
                      >
                        {opt.label}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              {fieldErrors.subject ? (
                <p className="auth-modal--contact__field-error">
                  {fieldErrors.subject}
                </p>
              ) : null}

              <div className="auth-modal__stack-field">
                <label
                  htmlFor="contact-message"
                  className="auth-modal__stack-label"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  className="auth-modal__textarea"
                  value={message}
                  placeholder="Tell us what's on your mind..."
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={5}
                  required
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.message;
                      return next;
                    });
                  }}
                />
                <p
                  className="auth-modal--contact__char-count"
                  aria-live="polite"
                >
                  {message.length} / {MAX_MESSAGE_LENGTH}
                </p>
              </div>
              {fieldErrors.message ? (
                <p className="auth-modal--contact__field-error">
                  {fieldErrors.message}
                </p>
              ) : null}

              {submitError ? (
                <p className="auth-modal__msg">{submitError}</p>
              ) : null}

              <div className="auth-modal__actions">
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  fullWidth
                  className="auth-modal__primary"
                  isDisabled={busy}
                >
                  {busy ? (
                    <span className="auth-modal--contact__submit-inner">
                      <IconLoader2
                        className="auth-modal--contact__spinner"
                        size={18}
                        strokeWidth={2}
                        aria-hidden
                      />
                      Sending…
                    </span>
                  ) : (
                    "Send message"
                  )}
                </Button>
              </div>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}

