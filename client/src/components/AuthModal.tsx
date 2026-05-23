import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconBrandGoogle } from "@tabler/icons-react";
import {
  Button,
  CloseButton,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { useAuth } from "../context/AuthContext";
import { validateSignupPromoCode, promoValidationErrorMessage } from "../lib/api/stripePromo";
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

const REGISTER_VALUE_ADD_COPY =
  "Premium members enjoy Plaid-connection sync saved data.";

function CreateAccountMarketing() {
  const showStripeSetupHint =
    import.meta.env.DEV && !stripePublishableKeyConfigured;
  return (
    <div className="auth-modal__register-marketing">
      <p className="auth-modal__register-marketing__value-add">
        {REGISTER_VALUE_ADD_COPY}
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
  const [showPromoField, setShowPromoField] = useState(false);
  const prevOpenRef = useRef<AuthModalMode | null>(null);

  const resetFields = useCallback(() => {
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
    setShowPromoField(false);
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
    if (!isValidEmail(em)) {
      setMsg("Enter a valid email.");
      return;
    }
    if (password.length < 8) {
      setMsg("Password must be at least 8 characters.");
      return;
    }
    const trimmedPromo = promoCode.trim();
    if (trimmedPromo) {
      setSignupStripeLoading(true);
      try {
        const promo = await validateSignupPromoCode(trimmedPromo);
        if (!promo.ok) {
          setMsg(promoValidationErrorMessage('error' in promo ? promo.error : undefined));
          return;
        }
        setPromoHint(promo.message);
        if (promo.waivesPayment) {
          setBusy(true);
          const { error } = await signUp(em, password, undefined, trimmedPromo);
          setBusy(false);
          if (error) {
            setMsg(error);
            return;
          }
          setMsg("Account created. You are signed in.");
          setMsgOk(true);
          return;
        }
      } catch {
        setMsg("Could not validate promo code. Try again.");
        return;
      } finally {
        setSignupStripeLoading(false);
      }
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
  }, [email, password, promoCode, signUp]);

  const onRegisterStripeBack = useCallback(() => {
    setRegisterStripeStep(1);
    setSignupClientSecret(null);
    setMsg(null);
    setSignupStripeErr(null);
    setStripePaymentBusy(false);
    setPromoHint(null);
  }, []);

  const onGoogleCheckoutWithPromo = useCallback(async () => {
    setMsg(null);
    setBusy(true);
    const trimmedPromo = promoCode.trim();
    if (!trimmedPromo) {
      setMsg("Enter a promo code.");
      setBusy(false);
      return;
    }
    try {
      const promo = await validateSignupPromoCode(trimmedPromo);
      if (!promo.ok) {
        setMsg(promoValidationErrorMessage('error' in promo ? promo.error : undefined));
        return;
      }
      setPromoHint(promo.message);
      if (!promo.waivesPayment) {
        return;
      }
      const { error } = await completeGoogleCheckout(undefined, trimmedPromo);
      if (error) setMsg(error);
      else {
        setMsg("Account setup complete. You are signed in.");
        setMsgOk(true);
      }
    } catch {
      setMsg("Could not complete signup. Try again.");
    } finally {
      setBusy(false);
    }
  }, [promoCode, completeGoogleCheckout]);

  const onRegisterPromoApply = useCallback(async () => {
    setMsg(null);
    setBusy(true);
    const trimmedPromo = promoCode.trim();
    if (!trimmedPromo) {
      setMsg("Enter a promo code.");
      setBusy(false);
      return;
    }
    try {
      const promo = await validateSignupPromoCode(trimmedPromo);
      if (!promo.ok) {
        setMsg(promoValidationErrorMessage('error' in promo ? promo.error : undefined));
        return;
      }
      setPromoHint(promo.message);
      if (!promo.waivesPayment) {
        return;
      }
      const em = email.trim();
      if (!isValidEmail(em)) {
        setMsg("Enter a valid email before applying a free signup code.");
        return;
      }
      if (password.length < 8) {
        setMsg("Password must be at least 8 characters.");
        return;
      }
      const { error } = await signUp(em, password, undefined, trimmedPromo);
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
  }, [promoCode, email, password, signUp]);

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

  const promoFooterLink = !showPromoField ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="auth-modal__footer-link auth-modal__footer-link--promo"
      onPress={() => setShowPromoField(true)}
    >
      Have a promo code?
    </Button>
  ) : null;

  const renderPromoBlock = (onApply: (() => void) | null) =>
    showPromoField ? (
      <div className="auth-modal__promo-block">
        <div className="auth-modal__promo-row">
          <TextField
            className="auth-modal__field auth-modal__field--floating auth-modal__field--promo"
            fullWidth
            variant="secondary"
            name="promoCode"
            value={promoCode}
            onChange={(v) => {
              setPromoCode(v);
              setPromoHint(null);
            }}
          >
            <Label className="auth-modal__label">Promo code</Label>
            <Input
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder=" "
            />
          </TextField>
          {onApply ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="auth-modal__outline auth-modal__promo-apply"
              isDisabled={busy || stripePaymentBusy || !promoCode.trim()}
              onPress={() => void onApply()}
            >
              Apply
            </Button>
          ) : null}
        </div>
        {promoHint ? (
          <p className="auth-modal__promo-hint">{promoHint}</p>
        ) : null}
      </div>
    ) : null;

  let title = "";
  let headerExtra: ReactNode = null;
  let headerSignupEmail: ReactNode = null;
  let headerPlanPrice: ReactNode = null;
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
      const stripePromise = getStripeBrowserPromise();
      headerSignupEmail = (
        <p className="auth-modal__header-identity" title={em}>
          Signed in as{" "}
          <strong className="auth-modal__header-identity-email">{em}</strong>
        </p>
      );
      const showPayment =
        Boolean(stripePromise) && signupClientSecret !== null;
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
            <RegisterStripePaymentForm
              stripePromise={stripePromise}
              clientSecret={signupClientSecret}
              email={em}
              password=""
              promoCode={promoCode.trim() || undefined}
              completeGoogleCheckout={completeGoogleCheckout}
              setMsg={setMsg}
              onBusyChange={setStripePaymentBusy}
              onRegistered={() => setMsgOk(true)}
            />
          ) : null}
          {renderPromoBlock(onGoogleCheckoutWithPromo)}
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
          {promoFooterLink}
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
                    <IconBrandGoogle size={18} strokeWidth={1.5} aria-hidden />
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
    title = "Create account";
    headerExtra = null;
    headerPlanPrice = (
      <p
        className="auth-modal__plan-price"
        aria-label="Subscription price, 9 dollars per month"
      >
        $9/mo
      </p>
    );
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
                          <IconBrandGoogle
                            size={18}
                            strokeWidth={1.5}
                            aria-hidden
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
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder=" "
                      />
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
                        autoComplete="new-password"
                        placeholder=" "
                      />
                    </TextField>
                  </div>
                  {renderPromoBlock(onRegisterPromoApply)}
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
                        : promoCode.trim()
                          ? "Continue"
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
                  <RegisterStripePaymentForm
                    stripePromise={stripePromise}
                    clientSecret={signupClientSecret}
                    email={email}
                    password={password}
                    promoCode={promoCode.trim() || undefined}
                    signUp={signUp}
                    setMsg={setMsg}
                    onBusyChange={setStripePaymentBusy}
                    onRegistered={() => setMsgOk(true)}
                  />
                ) : registerStripeStep === 2 ? (
                  <p className="auth-modal__subtitle auth-modal__subtitle--body-only">
                    Loading payment form…
                  </p>
                ) : null}
                {registerStripeStep === 2 ? renderPromoBlock(onRegisterPromoApply) : null}
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="auth-modal__footer-link"
          onPress={() => onSwitchMode("signin")}
        >
          Already have an account? Sign in
        </Button>
        {promoFooterLink}
      </>
    );
  } else {
    title = "Create account";
    headerExtra = null;
    headerPlanPrice = (
      <p
        className="auth-modal__plan-price"
        aria-label="Subscription price, 9 dollars per month"
      >
        $9/mo
      </p>
    );
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
                    <IconBrandGoogle size={18} strokeWidth={1.5} aria-hidden />
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
                  autoComplete="new-password"
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
    footer = (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="auth-modal__footer-link"
        onPress={() => onSwitchMode("signin")}
      >
        Already have an account? Sign in
      </Button>
    );
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
              {headerPlanPrice}
            </div>
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
