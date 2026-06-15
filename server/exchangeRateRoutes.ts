import type { Express } from 'express'
import {
  getUsdExchangeRateQuote,
  isWiseAuthConfigured,
  isWisePublicQuotesAvailable,
} from './wiseExchangeRates.js'

export function installExchangeRateRoutes(app: Express): void {
  app.get('/api/exchange-rates/status', (_req, res) => {
    res.json({
      ok: true,
      wisePublicQuotes: isWisePublicQuotesAvailable(),
      wiseAuthenticated: isWiseAuthConfigured(),
    })
  })

  app.get('/api/exchange-rates/:currencyCode', async (req, res) => {
    const currencyCode = String(req.params.currencyCode ?? '')
      .trim()
      .toUpperCase()

    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      res.status(400).json({ ok: false, error: 'invalid_currency_code' })
      return
    }

    if (currencyCode === 'USD') {
      res.json({
        ok: true,
        quote: {
          currencyCode: 'USD',
          rate: 1,
          source: 'open-er-api',
          updatedUtc: new Date().toISOString(),
        },
      })
      return
    }

    const quote = await getUsdExchangeRateQuote(currencyCode)
    if (!quote) {
      res.status(404).json({ ok: false, error: 'rate_unavailable' })
      return
    }

    res.json({ ok: true, quote })
  })
}
