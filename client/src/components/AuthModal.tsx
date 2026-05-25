import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleLogoMark } from "./ui/GoogleLogoMark";
import {
  Button,
  CloseButton,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { useAuth } from "../context/AuthContext";
import {
  appliedPromoFromValidation,
  validateSignupPromoCode,
  promoValidationErrorMessage,
  type AppliedSignupPromo,
} from "../lib/api/stripePromo";
import {
  getStripeBrowserPromise,
  stripePublishableKeyConfigured,
} from "../lib/stripeClient";
import {
  AUTH_STRIPE_REGISTER_FORM_ID,
  RegisterStripePaymentForm,
} from "./RegisterStripePaymentForm";
import "./AuthModal.scss";

export type AuthModalMode = "signin" | "register" | "google_checkout";

type Props = {
  open: AuthModalMode | null;
  onClose: () => void;
  onSwitchMode: (mode: AuthModalMode) => void;
};

function isValidEmail(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function firstNameFromDisplayName(
  displayName: string | null | undefined,
): string {
  if (!displayName?.trim()) return "";
  return displayName.trim().split(/\s+/)[0] ?? "";
}

function CreateAccountMarketing() {
  const showStripeSetupHint =
    import.meta.env.DEV && !stripePublishableKeyConfigured;
  return (
    <div className="auth-modal__register-marketing">
      <p className="auth-modal__register-marketing__value-add">
        Premium saves your CSV uploads, <strong>Plaid</strong> bank sync in the
        US and Canada, <strong>TrueLayer</strong> in Europe, and settings—kept
        in sync.
      </p>

      {showStripeSetupHint ? (
        <p className="auth-modal__register-marketing__dev">
          Developer setup: add{" "}
          <code className="auth-modal__register-marketing__code">
            VITE_STRIPE_PUBLISHABLE_KEY
          </code>{" "}
          to enable card collection at signup.
        </p>
      ) : null}
    </div>
  );
}

export function AuthModal({ open, onClose, onSwitchMode }: Props) {
  const {
    apiReady,
    googleOAuth,
    loading,
    user,
    googleCheckoutUi,
    resolveGoogleCheckoutFromUrl,
    completeGoogleCheckout,
    clearGoogleCheckoutUi,
    signIn,
    signUp,
    signInWithGoogle,
    authCallbackMessage,
    clearAuthCallbackMessage,
  } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signupClientSecret, setSignupClientSecret] = useState<string | null>(
    null,
  );
  const [signupStripeLoading, setSignupStripeLoading] = useState(false);
  const [signupStripeErr, setSignupStripeErr] = useState<string | null>(null);
  const [registerStripeStep, setRegisterStripeStep] = useState<1 | 2>(1);
  const [stripePaymentBusy, setStripePaymentBusy] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoHint, setPromoHint] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<AppliedSignupPromo | null>(
    null,
  );
  const prevOpenRef = useRef<AuthModalMode | null>(null);

  const resetFields = useCallback(() => {
    setFirstName("");
    setEmail("");
    setPassword("");
    setMsg(null);
    setMsgOk(false);
    setBusy(false);
    setSignupClientSecret(null);
    setSignupStripeErr(null);
    setSignupStripeLoading(false);
    setRegisterStripeStep(1);
    setStripePaymentBusy(false);
    setPromoCode("");
    setPromoHint(null);
    setAppliedPromo(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetFields();
      return;
    }
    setMsg(null);
    setMsgOk(false);
  }, [open, resetFields]);

  useEffect(() => {
    if (open !== "google_checkout" || !googleCheckoutUi?.email) return;
    setSignupStripeErr(null);
    setSignupStripeLoading(true);
    setSignupClientSecret(null);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/stripe/signup-setup-intent", {
          method: "POST",
          credentials: "include",
        });
        const data = (await res.json()) as {
          ok?: boolean;
          clientSecret?: string;
          error?: string;
        };
        if (cancelled) return;
        if (data.ok && data.clientSecret) {
          setSignupClientSecret(data.clientSecret);
          return;
        }
        if (data.error === "stripe_not_configured") {
          setSignupStripeErr("Stripe is not configured on the server.");
        } else {
          setSignupStripeErr("Could not start card verification. Try again.");
        }
      } catch {
        if (!cancelled) setSignupStripeErr("Could not reach payment setup.");
      } finally {
        if (!cancelled) setSignupStripeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, googleCheckoutUi?.email]);

  useEffect(() => {
    if (!open || !authCallbackMessage) return;
    setMsg(authCallbackMessage);
    setMsgOk(false);
    clearAuthCallbackMessage();
  }, [open, authCallbackMessage, clearAuthCallbackMessage]);

  useEffect(() => {
    if (user && open && open !== "google_checkout") {
      onClose();
      resetFields();
    }
  }, [user, open, onClose, resetFields]);

  useEffect(() => {
    if (open !== "google_checkout" || googleCheckoutUi?.email) return;
    void resolveGoogleCheckoutFromUrl();
  }, [open, googleCheckoutUi?.email, resolveGoogleCheckoutFromUrl]);

  useEffect(() => {
    const prev = prevOpenRef.current;
    prevOpenRef.current = open;
    if (
      open === "register" &&
      prev !== "register" &&
      stripePublishableKeyConfigured
    ) {
      setRegisterStripeStep(1);
      setSignupClientSecret(null);
      setSignupStripeErr(null);
      setSignupStripeLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const stripePromise = getStripeBrowserPromise();

  const onRegisterStripeContinue = useCallback(async () => {
    setMsg(null);
    setSignupStripeErr(null);
    setPromoHint(null);
    const em = email.trim();
    if (!firstName.trim()) {
      setMsg("Enter your first name.");
      return;
    }
    if (!isValidEmail(em)) {
      setMsg("Enter a valid email.");
      return;
    }
    if (password.length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }
    setSignupStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/signup-setup-intent", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        clientSecret?: string;
        error?: string;
      };
      if (data.ok && data.clientSecret) {
        setSignupClientSecret(data.clientSecret);
        setRegisterStripeStep(2);
        return;
      }
      if (data.error === "stripe_not_configured") {
        setSignupStripeErr(
          "Add STRIPE_SECRET_KEY on the server to save a card at signup.",
        );
      } else {
        setSignupStripeErr("Could not start card verification. Try again.");
      }
    } catch {
      setSignupStripeErr("Could not reach payment setup.");
    } finally {
      setSignupStripeLoading(false);
    }
  }, [email, firstName, password]);

  const onRegisterStripeBack = useCallback(() => {
    setRegisterStripeStep(1);
    setSignupClientSecret(null);
    setMsg(null);
    setSignupStripeErr(null);
    setStripePaymentBusy(false);
    setPromoHint(null);
    setAppliedPromo(null);
  }, []);

  const applySignupPromoCode = useCallback(async () => {
    setMsg(null);
    setMsgOk(false);
    const trimmedPromo = promoCode.trim();
    if (!trimmedPromo) {
      setMsg("Enter a promo code.");
      return;
    }
    setBusy(true);
    try {
      const promo = await validateSignupPromoCode(trimmedPromo);
      if (!promo.ok) {
        setAppliedPromo(null);
        setPromoHint(null);
        setMsg(
          promoValidationErrorMessage(
            "error" in promo ? promo.error : undefined,
            "hint" in promo ? promo.hint : undefined,
          ),
        );
        return;
      }
      const applied = appliedPromoFromValidation(promo);
      setAppliedPromo(applied);
      setPromoHint(applied.message);

      if (!applied.waivesPayment) return;

      if (open === "google_checkout") {
        const { error } = await completeGoogleCheckout(
          undefined,
          undefined,
          applied.promotionCodeId,
        );
        if (error) setMsg(error);
        else {
          setMsg("Account setup complete. You are signed in.");
          setMsgOk(true);
        }
        return;
      }

      const em = email.trim();
      if (!firstName.trim()) {
        setMsg("Enter your first name before applying a free signup code.");
        return;
      }
      if (!isValidEmail(em)) {
        setMsg("Enter a valid email before applying a free signup code.");
        return;
      }
      if (password.length < 8) {
        setMsg("Password must be at least 8 characters.");
        return;
      }
      const { error } = await signUp(
        em,
        password,
        undefined,
        undefined,
        applied.promotionCodeId,
      );
      if (error) setMsg(error);
      else {
        setMsg("Account created. You are signed in.");
        setMsgOk(true);
      }
    } catch {
      setMsg("Could not apply promo code. Try again.");
    } finally {
      setBusy(false);
    }
  }, [
    promoCode,
    open,
    completeGoogleCheckout,
    email,
    firstName,
    password,
    signUp,
  ]);

  async function onSignInSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setMsgOk(false);
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) {
      setMsg(error);
      return;
    }
    setMsg("Signed in.");
    setMsgOk(true);
  }

  async function onRegisterNoStripe(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setMsgOk(false);
    if (!firstName.trim()) {
      setMsg("Enter your first name.");
      return;
    }
    setBusy(true);
    const { error } = await signUp(email, password);
    setBusy(false);
    if (error) {
      setMsg(error);
      return;
    }
    setMsg("Account created. You are signed in.");
    setMsgOk(true);
  }

  if (!open) return null;

  const renderPromoBlock = (onApply: (() => void) | null) => (
    <div className="auth-modal__promo-block">
      <span
        className="auth-modal__label auth-modal__promo-label"
        id="auth-promo-label"
      >
        Promo Code
      </span>
      <div
        className="auth-modal__promo-combo"
        role="group"
        aria-labelledby="auth-promo-label"
      >
        <TextField
          className="auth-modal__field auth-modal__field--promo"
          fullWidth
          variant="secondary"
          name="promoCode"
          value={promoCode}
          onChange={(v) => {
            setPromoCode(v);
            setPromoHint(null);
            setAppliedPromo(null);
          }}
        >
          <Input
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="Promo"
            aria-label="Promo Code"
          />
        </TextField>
        {onApply ? (
          <Button
            type="button"
            size="sm"
            variant="primary"
            className="auth-modal__promo-apply"
            isDisabled={busy || stripePaymentBusy || !promoCode.trim()}
            onPress={() => void (onApply ? onApply() : applySignupPromoCode())}
          >
            Apply
          </Button>
        ) : null}
      </div>
      {promoHint ? (
        <p
          className={`auth-modal__promo-hint${appliedPromo ? " auth-modal__promo-hint--applied" : ""}`}
          role="status"
        >
          {promoHint}
        </p>
      ) : null}
    </div>
  );

  const renderRegisterFooter = () => (
    <div className="auth-modal__register-footer">
      <p className="auth-modal__register-footer-line">
        Already have an account?{" "}
        <button
          type="button"
          className="auth-modal__inline-link"
          onClick={() => onSwitchMode("signin")}
        >
          Sign in
        </button>
      </p>
      <p className="auth-modal__register-footer-line">
        Just exploring?{" "}
        <button
          type="button"
          className="auth-modal__inline-link"
          onClick={onClose}
        >
          Continue without an account
        </button>
      </p>
    </div>
  );

  const renderRegisterCredFields = () => (
    <div className="auth-modal__cred-stack">
      <TextField
        className="auth-modal__field auth-modal__field--floating"
        fullWidth
        variant="secondary"
        name="firstName"
        value={firstName}
        onChange={(v) => setFirstName(v)}
        isRequired
      >
        <Label className="auth-modal__label">First name</Label>
        <Input type="text" autoComplete="given-name" placeholder=" " />
      </TextField>
      <TextField
        className="auth-modal__field auth-modal__field--floating"
        fullWidth
        variant="secondary"
        name="email"
        value={email}
        onChange={(v) => setEmail(v)}
        isRequired
      >
        <Label className="auth-modal__label">Email</Label>
        <Input type="email" autoComplete="email" placeholder=" " />
      </TextField>
      <TextField
        className="auth-modal__field auth-modal__field--floating"
        fullWidth
        variant="secondary"
        name="password"
        value={password}
        onChange={(v) => setPassword(v)}
        isRequired
      >
        <Label className="auth-modal__label">Password</Label>
        <Input type="password" autoComplete="new-password" placeholder=" " />
      </TextField>
    </div>
  );

  let title = "";
  let headerExtra: ReactNode = null;
  let headerSignupEmail: ReactNode = null;
  let showRegisterHeader = false;
  let body: ReactNode = null;
  let footer: ReactNode = null;

  if (!apiReady && !loading) {
    title =
      open === "signin"
        ? "Sign in"
        : open === "register"
          ? "Create account"
          : "Complete your account";
    body = (
      <>
        <p className="auth-modal__api-hint">
          Start the API (<code>npm run dev -w server</code>) with MySQL and{" "}
          <code>JWT_SECRET</code> in <code>server/.env</code>, then refresh.
          Vite proxies <code>/api</code> to port 3001.
        </p>
        <div className="auth-modal__actions">
          <Button
            size="sm"
            variant="outline"
            fullWidth
            className="auth-modal__outline"
            onPress={onClose}
          >
            Close
          </Button>
        </div>
      </>
    );
    footer = null;
  } else if (loading) {
    title =
      open === "signin"
        ? "Sign in"
        : open === "register"
          ? "Create account"
          : "Complete your account";
    body = (
      <p className="auth-modal__subtitle auth-modal__subtitle--body-only">
        Checking session…
      </p>
    );
    footer = null;
  } else if (open === "google_checkout") {
    title = "Complete your account";
    headerExtra = null;
    const gc = googleCheckoutUi;
    if (!gc?.email) {
      body = (
        <>
          <p className="auth-modal__subtitle">
            This setup step is no longer valid. Close and use &quot;Continue
            with Google&quot; again to continue.
          </p>
          <div className="auth-modal__actions">
            <Button
              type="button"
              size="sm"
              variant="primary"
              fullWidth
              className="auth-modal__primary"
              onPress={() => {
                clearGoogleCheckoutUi();
                onClose();
              }}
            >
              Close
            </Button>
          </div>
        </>
      );
      footer = null;
    } else if (!stripePublishableKeyConfigured) {
      body = import.meta.env.DEV ? (
        <p className="auth-modal__msg">
          Add{" "}
          <code className="auth-modal__subtitle-code">
            VITE_STRIPE_PUBLISHABLE_KEY
          </code>{" "}
          to the client environment so the payment form can load, then refresh
          this page.
        </p>
      ) : (
        <p className="auth-modal__msg">
          Payment setup is temporarily unavailable. Please try again later or
          contact support.
        </p>
      );
      footer = (
        <div className="auth-modal__actions">
          <Button
            type="button"
            size="sm"
            variant="outline"
            fullWidth
            className="auth-modal__outline"
            onPress={onClose}
          >
            Close
          </Button>
        </div>
      );
    } else {
      const em = gc.email;
      const googleFirstName = firstNameFromDisplayName(gc.displayName);
      const stripePromise = getStripeBrowserPromise();
      headerSignupEmail = (
        <p className="auth-modal__header-identity" title={em}>
          Signed in as{" "}
          <strong className="auth-modal__header-identity-email">{em}</strong>
        </p>
      );
      const showPayment = Boolean(stripePromise) && signupClientSecret !== null;
      body = (
        <>
          {signupStripeErr ? (
            <p className="auth-modal__msg">{signupStripeErr}</p>
          ) : null}
          {signupStripeLoading ? (
            <p className="auth-modal__subtitle auth-modal__subtitle--body-only">
              Preparing payment form…
            </p>
          ) : null}
          {showPayment && stripePromise ? (
            <div className="auth-modal__reg-payment-step">
              <RegisterStripePaymentForm
                stripePromise={stripePromise}
                clientSecret={signupClientSecret}
                email={em}
                password=""
                readOnlyFirstName={googleFirstName}
                billingFirstName={googleFirstName}
                hideNameFields
                promoCode={
                  appliedPromo?.code ?? (promoCode.trim() || undefined)
                }
                promotionCodeId={appliedPromo?.promotionCodeId}
                completeGoogleCheckout={completeGoogleCheckout}
                setMsg={setMsg}
                onBusyChange={setStripePaymentBusy}
                onRegistered={() => setMsgOk(true)}
              />
              <hr className="auth-modal__payment-divider" aria-hidden />
              {renderPromoBlock(applySignupPromoCode)}
            </div>
          ) : null}
          {msg ? (
            <p
              className={`auth-modal__msg${msgOk ? " auth-modal__msg--ok" : ""}`}
            >
              {msg}
            </p>
          ) : null}
        </>
      );
      footer = (
        <>
          <div className="auth-modal__footer-pay">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="auth-modal__outline auth-modal__reg-back"
              onPress={() => {
                clearGoogleCheckoutUi();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={AUTH_STRIPE_REGISTER_FORM_ID}
              size="sm"
              variant="primary"
              className="auth-modal__primary auth-modal__primary--with-back"
              isDisabled={stripePaymentBusy || !showPayment}
            >
              Start Premium — $9/month
            </Button>
          </div>
        </>
      );
    }
  } else if (open === "signin") {
    title = "Sign in";
    headerExtra = null;
    body = (
      <>
        <div className="auth-modal__form-entrance" key={open}>
          {apiReady && googleOAuth ? (
            <>
              <div className="auth-modal__oauth-row">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  fullWidth
                  className="auth-modal__outline auth-modal__google"
                  onPress={() => signInWithGoogle()}
                >
                  <span className="auth-modal__google-inner">
                    <GoogleLogoMark
                      className="auth-modal__google-logo"
                      size={18}
                    />
                    Continue with Google
                  </span>
                </Button>
              </div>
              <p className="auth-modal__oauth-divider" aria-hidden>
                <span>or</span>
              </p>
            </>
          ) : null}
          <Form
            validationBehavior="native"
            className="auth-modal__form"
            onSubmit={(e) => void onSignInSubmit(e)}
          >
            <div className="auth-modal__cred-row">
              <TextField
                className="auth-modal__field auth-modal__field--floating"
                fullWidth
                variant="secondary"
                name="email"
                value={email}
                onChange={(v) => setEmail(v)}
                isRequired
              >
                <Label className="auth-modal__label">Email</Label>
                <Input type="email" autoComplete="email" placeholder=" " />
              </TextField>
              <TextField
                className="auth-modal__field auth-modal__field--floating"
                fullWidth
                variant="secondary"
                name="password"
                value={password}
                onChange={(v) => setPassword(v)}
                isRequired
              >
                <Label className="auth-modal__label">Password</Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder=" "
                />
              </TextField>
            </div>
            <div className="auth-modal__actions">
              <Button
                type="submit"
                size="sm"
                variant="primary"
                fullWidth
                className="auth-modal__primary auth-modal__primary--signin"
                isDisabled={busy}
              >
                Sign in
              </Button>
            </div>
          </Form>
        </div>
        {msg ? (
          <p
            className={`auth-modal__msg${msgOk ? " auth-modal__msg--ok" : ""}`}
          >
            {msg}
          </p>
        ) : null}
      </>
    );
    footer = (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="auth-modal__footer-link"
        onPress={() => onSwitchMode("register")}
      >
        Need an account? Create one
      </Button>
    );
  } else if (stripePublishableKeyConfigured) {
    title = "Save your retirement plan";
    showRegisterHeader = true;
    headerExtra = null;
    if (registerStripeStep === 2 && email.trim()) {
      const em = email.trim();
      headerSignupEmail = (
        <p className="auth-modal__header-identity" title={em}>
          Signing up as{" "}
          <strong className="auth-modal__header-identity-email">{em}</strong>
        </p>
      );
    }

    const showPayment =
      registerStripeStep === 2 &&
      stripePromise !== null &&
      signupClientSecret !== null;

    body = (
      <>
        <div
          className="auth-modal__form-entrance auth-modal__form-entrance--register-stripe"
          key={open}
        >
          <div
            className={`auth-modal__reg-slider${registerStripeStep === 2 ? " auth-modal__reg-slider--step-2" : ""}`}
          >
            <div className="auth-modal__reg-track">
              <div className="auth-modal__reg-slide">
                <CreateAccountMarketing />
                {signupStripeErr ? (
                  <p className="auth-modal__msg">{signupStripeErr}</p>
                ) : null}
                {apiReady && googleOAuth ? (
                  <>
                    <div className="auth-modal__oauth-row">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        fullWidth
                        className="auth-modal__outline auth-modal__google"
                        onPress={() => signInWithGoogle()}
                      >
                        <span className="auth-modal__google-inner">
                          <GoogleLogoMark
                            className="auth-modal__google-logo"
                            size={18}
                          />
                          Continue with Google
                        </span>
                      </Button>
                    </div>
                    <p className="auth-modal__oauth-divider" aria-hidden>
                      <span>or</span>
                    </p>
                  </>
                ) : null}
                <Form
                  validationBehavior="native"
                  className="auth-modal__form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void onRegisterStripeContinue();
                  }}
                >
                  {renderRegisterCredFields()}
                  <div className="auth-modal__actions">
                    <Button
                      type="submit"
                      size="sm"
                      variant="primary"
                      fullWidth
                      className="auth-modal__primary"
                      isDisabled={signupStripeLoading}
                    >
                      {signupStripeLoading
                        ? "Preparing payment…"
                        : "Continue to payment"}
                    </Button>
                  </div>
                </Form>
                {msg && registerStripeStep === 1 ? (
                  <p
                    className={`auth-modal__msg${msgOk ? " auth-modal__msg--ok" : ""}`}
                  >
                    {msg}
                  </p>
                ) : null}
              </div>
              <div className="auth-modal__reg-slide">
                {showPayment ? (
                  <div className="auth-modal__reg-payment-step">
                    <RegisterStripePaymentForm
                      stripePromise={stripePromise}
                      clientSecret={signupClientSecret}
                      email={email}
                      password={password}
                      billingFirstName={firstName}
                      hideNameFields
                      promoCode={
                        appliedPromo?.code ?? (promoCode.trim() || undefined)
                      }
                      promotionCodeId={appliedPromo?.promotionCodeId}
                      signUp={signUp}
                      setMsg={setMsg}
                      onBusyChange={setStripePaymentBusy}
                      onRegistered={() => setMsgOk(true)}
                    />
                    <hr className="auth-modal__payment-divider" aria-hidden />
                    {renderPromoBlock(applySignupPromoCode)}
                  </div>
                ) : registerStripeStep === 2 ? (
                  <p className="auth-modal__subtitle auth-modal__subtitle--body-only">
                    Loading payment form…
                  </p>
                ) : null}
                {msg && registerStripeStep === 2 ? (
                  <p
                    className={`auth-modal__msg${msgOk ? " auth-modal__msg--ok" : ""}`}
                  >
                    {msg}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </>
    );
    footer = (
      <>
        {registerStripeStep === 2 ? (
          <div className="auth-modal__footer-pay">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="auth-modal__outline auth-modal__reg-back"
              onPress={onRegisterStripeBack}
            >
              Back
            </Button>
            <Button
              type="submit"
              form={AUTH_STRIPE_REGISTER_FORM_ID}
              size="sm"
              variant="primary"
              className="auth-modal__primary auth-modal__primary--with-back"
              isDisabled={stripePaymentBusy || !showPayment}
            >
              Create account
            </Button>
          </div>
        ) : null}
        {renderRegisterFooter()}
      </>
    );
  } else {
    title = "Save your retirement plan";
    showRegisterHeader = true;
    headerExtra = null;
    body = (
      <>
        <div className="auth-modal__form-entrance" key={open}>
          <CreateAccountMarketing />
          {apiReady && googleOAuth ? (
            <>
              <div className="auth-modal__oauth-row">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  fullWidth
                  className="auth-modal__outline auth-modal__google"
                  onPress={() => signInWithGoogle()}
                >
                  <span className="auth-modal__google-inner">
                    <GoogleLogoMark
                      className="auth-modal__google-logo"
                      size={18}
                    />
                    Continue with Google
                  </span>
                </Button>
              </div>
              <p className="auth-modal__oauth-divider" aria-hidden>
                <span>or</span>
              </p>
            </>
          ) : null}
          <Form
            validationBehavior="native"
            className="auth-modal__form"
            onSubmit={(e) => void onRegisterNoStripe(e)}
          >
            {renderRegisterCredFields()}
            <div className="auth-modal__actions">
              <Button
                type="submit"
                size="sm"
                variant="primary"
                fullWidth
                className="auth-modal__primary"
                isDisabled={busy}
              >
                Create account
              </Button>
            </div>
          </Form>
        </div>
        {msg ? (
          <p
            className={`auth-modal__msg${msgOk ? " auth-modal__msg--ok" : ""}`}
          >
            {msg}
          </p>
        ) : null}
      </>
    );
    footer = renderRegisterFooter();
  }

  return (
    <div
      className="auth-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <button
        type="button"
        className="auth-modal__backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={`auth-modal__panel${footer ? "" : " auth-modal__panel--no-footer"}`}
      >
        <header className="auth-modal__header">
          <div className="auth-modal__header-main">
            <div className="auth-modal__header-title-row">
              <h2 id="auth-modal-title" className="auth-modal__title">
                {title}
              </h2>
            </div>
            {showRegisterHeader ? (
              <p className="auth-modal__register-tagline">
                Everything synced, nothing lost.{" "}
                <span className="auth-modal__register-tagline-price">
                  $9/mo
                </span>{" "}
                — cancel anytime.
              </p>
            ) : null}
            {headerSignupEmail}
            {headerExtra}
          </div>
          <CloseButton
            className="auth-modal__close"
            aria-label="Close"
            onPress={onClose}
          />
        </header>
        <div className="auth-modal__body" tabIndex={-1}>
          {body}
        </div>
        {footer ? (
          <footer className="auth-modal__footer">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
}
