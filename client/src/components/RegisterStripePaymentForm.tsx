import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Form, Input, Label, TextField } from '@heroui/react'
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import type { Appearance, Stripe, StripeElementsOptions } from '@stripe/stripe-js'
import './AuthBarStripe.scss'

const BILLING_COUNTRY_US = 'US' as const

/* Stripe iframes cannot resolve CSS variables; use literal rem matching tokens.css --text-sm. */
const CARD_ELEMENT_BASE_STYLE = {
  fontSize: '0.75rem',
  fontFamily: 'Nunito, ui-monospace, system-ui, sans-serif',
  color: '#1c2b3a',
  '::placeholder': {
    color: '#888780',
  },
} as const

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: CARD_ELEMENT_BASE_STYLE,
    invalid: {
      color: '#a32d2d',
    },
  },
}

const CARD_NUMBER_OPTIONS = {
  ...CARD_ELEMENT_OPTIONS,
  disableLink: true,
  placeholder: '1234 1234 1234 1234',
} as const

const CARD_EXPIRY_OPTIONS = {
  ...CARD_ELEMENT_OPTIONS,
  placeholder: 'MM/YY',
} as const

const CARD_CVC_OPTIONS = {
  ...CARD_ELEMENT_OPTIONS,
  placeholder: 'CVC',
} as const

/** Stripe Elements appearance (align with app accent / surface). */
const AUTH_REGISTER_ELEMENTS_APPEARANCE: Appearance = {
  theme: 'stripe',
  variables: {
    fontSizeBase: '0.75rem',
    borderRadius: '8px',
    colorPrimary: '#0f6e56',
    colorBackground: '#ffffff',
    colorText: '#1c2b3a',
    colorTextSecondary: '#5f5e5a',
    colorDanger: '#a32d2d',
  },
}

type SignUpFn = (
  email: string,
  password: string,
  paymentMethodId?: string,
  promoCode?: string,
  promotionCodeId?: string,
  displayName?: string,
) => Promise<{ error?: string }>

type CompleteGoogleFn = (
  paymentMethodId?: string,
  promoCode?: string,
  promotionCodeId?: string,
) => Promise<{ error?: string }>

/** Exported for modal footer submit (`form` attribute must match `<Form id>`). */
export const AUTH_STRIPE_REGISTER_FORM_ID = 'auth-stripe-register-payment-form'

type PaymentInnerProps = {
  clientSecret: string
  email: string
  password: string
  billingFirstName?: string
  /** First name collected on step 1 — hide duplicate field on payment step. */
  hideNameFields?: boolean
  /** Google SSO: show first name read-only on payment step. */
  readOnlyFirstName?: string
  promoCode?: string
  promotionCodeId?: string
  signUp?: SignUpFn
  completeGoogleCheckout?: CompleteGoogleFn
  setMsg: (v: string | null) => void
  onBusyChange?: (busy: boolean) => void
  onRegistered?: () => void
}

function RegisterStripePaymentInner({
  clientSecret,
  email,
  password,
  billingFirstName = '',
  hideNameFields = false,
  readOnlyFirstName = '',
  promoCode,
  promotionCodeId,
  signUp,
  completeGoogleCheckout,
  setMsg,
  onBusyChange,
  onRegistered,
}: PaymentInnerProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [firstName, setFirstName] = useState(billingFirstName)
  const [busy, setBusy] = useState(false)
  const onBusyChangeRef = useRef(onBusyChange)
  onBusyChangeRef.current = onBusyChange

  useEffect(() => {
    onBusyChangeRef.current?.(busy)
  }, [busy])

  useEffect(() => {
    if (hideNameFields) return
    setFirstName(billingFirstName)
  }, [billingFirstName, hideNameFields])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (!stripe || !elements) {
      setMsg('Payment form is still loading.')
      return
    }
    setBusy(true)
    try {
      const cardNumberEl = elements.getElement(CardNumberElement)
      if (!cardNumberEl) {
        setMsg('Card number field is not ready.')
        setBusy(false)
        return
      }

      /* Split CardNumber/Expiry/CVC elements require confirmCardSetup, not confirmSetup({ elements }) (Payment Element only). */
      const billingName = hideNameFields
        ? billingFirstName.trim()
        : firstName.trim()
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardNumberEl,
          billing_details: {
            email: email.trim(),
            name: billingName || undefined,
            address: {
              country: BILLING_COUNTRY_US,
            },
          },
        },
        return_url: window.location.href,
      })
      if (error) {
        setMsg(error.message ?? 'Card verification failed.')
        setBusy(false)
        return
      }
      const pm = setupIntent?.payment_method
      const paymentMethodId = typeof pm === 'string' ? pm : pm?.id
      if (!paymentMethodId) {
        setMsg('Could not confirm payment method.')
        setBusy(false)
        return
      }
      if (completeGoogleCheckout) {
        const { error: regErr } = await completeGoogleCheckout(
          paymentMethodId,
          promotionCodeId ? undefined : promoCode,
          promotionCodeId,
        )
        if (regErr) setMsg(regErr)
        else {
          setMsg('Account setup complete. You are signed in.')
          onRegistered?.()
        }
      } else if (signUp) {
        const { error: regErr } = await signUp(
          email,
          password,
          paymentMethodId,
          promotionCodeId ? undefined : promoCode,
          promotionCodeId,
          billingFirstName?.trim() || undefined,
        )
        if (regErr) setMsg(regErr)
        else {
          setMsg('Account created. You are signed in.')
          onRegistered?.()
        }
      } else {
        setMsg('Payment flow is not configured.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Form
      id={AUTH_STRIPE_REGISTER_FORM_ID}
      validationBehavior="native"
      className="auth-bar-stripe-form"
      onSubmit={(e) => void onSubmit(e)}
    >
      {readOnlyFirstName ? (
        <TextField
          name="firstName"
          className="auth-modal__field auth-bar-stripe-textfield auth-modal__field--readonly"
          fullWidth
          variant="secondary"
          value={readOnlyFirstName}
          isReadOnly
        >
          <Label className="auth-modal__label">First name</Label>
          <Input type="text" readOnly autoComplete="given-name" />
        </TextField>
      ) : hideNameFields ? null : (
        <TextField
          name="firstName"
          className="auth-modal__field auth-bar-stripe-textfield"
          fullWidth
          variant="secondary"
          value={firstName}
          onChange={setFirstName}
          isRequired
        >
          <Label className="auth-modal__label">First name</Label>
          <Input type="text" autoComplete="given-name" />
        </TextField>
      )}

      <div className="auth-bar-stripe-card-row">
        <TextField
          name="cardNumber"
          className="auth-modal__field auth-bar-stripe-textfield"
          fullWidth
          variant="secondary"
        >
          <Label className="auth-modal__label">Card Number</Label>
          <div className="auth-bar-stripe-slot">
            <CardNumberElement options={CARD_NUMBER_OPTIONS} />
          </div>
        </TextField>
        <TextField
          name="cardExpiry"
          className="auth-modal__field auth-bar-stripe-textfield"
          fullWidth
          variant="secondary"
        >
          <Label className="auth-modal__label">Exp Date</Label>
          <div className="auth-bar-stripe-slot">
            <CardExpiryElement options={CARD_EXPIRY_OPTIONS} />
          </div>
        </TextField>
        <TextField
          name="cardCvc"
          className="auth-modal__field auth-bar-stripe-textfield"
          fullWidth
          variant="secondary"
        >
          <Label className="auth-modal__label">Security Code</Label>
          <div className="auth-bar-stripe-slot">
            <CardCvcElement options={CARD_CVC_OPTIONS} />
          </div>
        </TextField>
      </div>
    </Form>
  )
}

type PaymentProps = PaymentInnerProps & {
  stripePromise: Promise<Stripe | null>
}

/** HeroUI fields + Stripe Card Elements for SetupIntent collection. */
export function RegisterStripePaymentForm({ stripePromise, clientSecret, ...rest }: PaymentProps) {
  const elementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: AUTH_REGISTER_ELEMENTS_APPEARANCE,
  }

  return (
    <Elements key={clientSecret} stripe={stripePromise} options={elementsOptions}>
      <RegisterStripePaymentInner clientSecret={clientSecret} {...rest} />
    </Elements>
  )
}
