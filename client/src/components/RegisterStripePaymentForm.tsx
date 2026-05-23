import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Form, Label, TextField } from '@heroui/react'
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
) => Promise<{ error?: string }>

type CompleteGoogleFn = (
  paymentMethodId?: string,
  promoCode?: string,
) => Promise<{ error?: string }>

/** Exported for modal footer submit (`form` attribute must match `<Form id>`). */
export const AUTH_STRIPE_REGISTER_FORM_ID = 'auth-stripe-register-payment-form'

type PaymentInnerProps = {
  clientSecret: string
  email: string
  password: string
  promoCode?: string
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
  promoCode,
  signUp,
  completeGoogleCheckout,
  setMsg,
  onBusyChange,
  onRegistered,
}: PaymentInnerProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const onBusyChangeRef = useRef(onBusyChange)
  onBusyChangeRef.current = onBusyChange

  useEffect(() => {
    onBusyChangeRef.current?.(busy)
  }, [busy])

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
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardNumberEl,
          billing_details: {
            email: email.trim(),
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
        const { error: regErr } = await completeGoogleCheckout(paymentMethodId, promoCode)
        if (regErr) setMsg(regErr)
        else {
          setMsg('Account setup complete. You are signed in.')
          onRegistered?.()
        }
      } else if (signUp) {
        const { error: regErr } = await signUp(email, password, paymentMethodId, promoCode)
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
      <TextField
        name="cardNumber"
        className="auth-modal__field auth-bar-stripe-textfield"
        fullWidth
        variant="secondary"
      >
        <Label className="auth-modal__label">Card number</Label>
        <div className="auth-bar-stripe-slot">
          <CardNumberElement options={{ ...CARD_ELEMENT_OPTIONS, disableLink: true }} />
        </div>
      </TextField>

      <div className="auth-modal__cred-row">
        <TextField
          name="cardExpiry"
          className="auth-modal__field auth-bar-stripe-textfield"
          fullWidth
          variant="secondary"
        >
          <Label className="auth-modal__label">Expiration date</Label>
          <div className="auth-bar-stripe-slot">
            <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </TextField>
        <TextField
          name="cardCvc"
          className="auth-modal__field auth-bar-stripe-textfield"
          fullWidth
          variant="secondary"
        >
          <Label className="auth-modal__label">Security code</Label>
          <div className="auth-bar-stripe-slot">
            <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
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
