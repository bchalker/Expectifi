/**
 * Capture landing-page marketing screenshots at 1280px viewport.
 * Usage: npx playwright@1.52.0 install chromium && node scripts/capture-landing-screenshots.mjs
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'client/public/screenshots')
const baseUrl = process.env.CAPTURE_BASE_URL ?? 'http://localhost:5173'

function seedScript() {
  const accounts = {
    version: 1,
    onboardingCompleted: true,
    entries: [
      { id: 'brk-1', type: 'brokerage', balance: 485_000 },
      { id: 'pretax-1', type: 'pretax_401k_ira', balance: 312_000 },
      { id: 'roth-1', type: 'roth_ira', balance: 198_000 },
      { id: 'hsa-1', type: 'hsa', balance: 42_000 },
    ],
  }

  const profile = {
    version: 1,
    onboardingComplete: true,
    country: 'US',
    locale: 'us',
    currency: 'USD',
    dob: '1978-03-15',
    birth_month: 3,
    birth_year: 1978,
    target_retirement_age: 62,
    monthly_income_goal: 8200,
    filing_status: 'single',
    include_social_security: true,
    ss_claim_age: 67,
    ss_benefit_estimate: 2800,
  }

  const session = {
    version: 1,
    phase: 'income',
    activePreset: null,
    inputs: {
      base401k: 0,
      baseSE401k: 0,
      baseTradIRA: 0,
      baseRoth: 0,
      baseHsa: 0,
      brkBal: 0,
      retRate: 0.07,
      brkRate: 0.07,
      save: 0,
      wdRate: 0.04,
      wdInflation: 0.025,
      incYield: 0.035,
      incGrowth: 0.01,
      ssAge: 67,
      spouseClaimAge: 67,
      ssBenefit62: 0,
      ssBenefit67: 2800,
      ssBenefit70: 0,
      married: false,
      spouseDateOfBirth: '',
      spouseHasOwnEarnings: true,
      spouseBenefit62: 0,
      spouseBenefit67: 0,
      spouseBenefit70: 0,
      other: 0,
      retireRegions: [{ id: 'luxembourg', label: 'Luxembourg' }],
      ssInvestPct: 5,
      dateOfBirth: '1978-03-15',
      targetRetirementAge: 62,
      growthGoal: 0,
      monthlyIncomeGoal: 8200,
      incomePresets: [],
      positionReturnModels: [],
      accountReturnScenarios: {},
      marketScenario: 'base',
      marketScenarioActive: false,
      residenceCountry: 'US',
      filingStatus: 'single',
    },
    ui: {
      incomeMode: true,
      ssIncluded: true,
      incomeSecurityTicker: null,
      accountIncomeFunds: {
        'manual:brk-1': 'SCHD',
        'manual:pretax-1': 'BND',
        'manual:roth-1': 'VYM',
        'manual:hsa-1': 'BND',
      },
      accountIncomeStrategies: {
        'manual:brk-1': 'both',
        'manual:pretax-1': 'withdraw',
        'manual:roth-1': 'dividend',
        'manual:hsa-1': 'dividend',
      },
      accountWithdrawRates: {
        'manual:brk-1': 0.04,
        'manual:pretax-1': 0.04,
      },
    },
  }

  localStorage.setItem(
    'expectifi/meta-v1',
    JSON.stringify({
      version: 1,
      tier: 'browser_saved',
      visitCount: 1,
      prompts: { savePlanAcceptedAt: new Date().toISOString() },
    }),
  )
  localStorage.setItem('expectifi/profile-v1', JSON.stringify(profile))
  localStorage.setItem('expectifi/accounts-v1', JSON.stringify(accounts))
  localStorage.setItem('expectifi/session-v1', JSON.stringify(session))
  localStorage.setItem('retirement-calculator/balance-input-mode', 'manual')
  sessionStorage.setItem('expectifi/session/onboarding-complete', '1')
}

async function screenshotIncomeRegion(page, outPath) {
  await page.waitForSelector('.portfolio-accounts-reveal--in', { timeout: 30_000 })
  await page.waitForTimeout(900)

  await page.addStyleTag({
    content: `
      .app-header-shell,
      .sub-header-shell,
      .super-header,
      .yield-controls-section,
      .withdraw-controls-section,
      .app-privacy-trust,
      .tax-summary-card__accordion { display: none !important; }
      .portfolio-accounts-reveal--in .account-balances-stack,
      .portfolio-accounts-reveal--in .account-balances-stack .portfolio-account-list > *,
      .portfolio-accounts-reveal--in .account-balances-stack .account-balances-card-inner-wrap > * {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
      }
    `,
  })
  await page.waitForTimeout(200)

  const clip = await page.evaluate(() => {
    const layout = document.querySelector('.section--tax-summary__income-layout')
    const guide = document.querySelector('.imported-holdings-scenario-guide--income')
    const accountsCol = document.querySelector('.tax-summary-card__accounts')
    const previewPanel = document.querySelector('.where-to-retire-preview-panel')
    const total = accountsCol?.querySelector(
      '.account-balances-section-footer__total--income, .account-balances-total-retirement--income',
    )
    if (!layout || !guide) return null
    const layoutRect = layout.getBoundingClientRect()
    const guideRect = guide.getBoundingClientRect()
    const leftBottom = total
      ? total.getBoundingClientRect().bottom + 12
      : (accountsCol?.getBoundingClientRect().bottom ?? layoutRect.bottom)
    const previewBottom = previewPanel?.getBoundingClientRect().bottom ?? leftBottom
    const bottom = Math.max(leftBottom, previewBottom)
    return {
      x: Math.max(0, layoutRect.x),
      y: Math.max(0, guideRect.y),
      width: layoutRect.width,
      height: bottom - guideRect.y,
    }
  })
  if (!clip) throw new Error('Income screenshot region not found')
  await page.screenshot({ path: outPath, clip, type: 'png' })
}

async function screenshotWtrRegion(page, outPath) {
  await page.addStyleTag({
    content: `
      .app-header-shell,
      .sub-header-shell,
      .super-header,
      .where-to-retire__income-toolbar,
      .where-to-retire__panel-back,
      .app-privacy-trust { display: none !important; }
    `,
  })
  await page.waitForTimeout(400)

  const clip = await page.evaluate(() => {
    const intro = document.querySelector('.wtr-budget-hero--intro')
    const panel = document.querySelector('.where-to-retire__main-panel-map')
    if (!intro || !panel) return null
    const introRect = intro.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    const x = Math.min(introRect.x, panelRect.x)
    const width = Math.max(introRect.right, panelRect.right) - x
    return {
      x: Math.max(0, x),
      y: Math.max(0, introRect.y),
      width,
      height: panelRect.bottom - introRect.y,
    }
  })
  if (!clip) throw new Error('Where to Retire screenshot region not found')
  await page.screenshot({ path: outPath, clip, type: 'png' })
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  })

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.evaluate(seedScript)
  await page.reload({ waitUntil: 'networkidle' })

  await page.waitForSelector('.section--tax-summary--income-harvest', { timeout: 30_000 })
  await screenshotIncomeRegion(page, path.join(outDir, 'income-mode-preview.png'))

  await page.goto(`${baseUrl}/where-to-retire`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.where-to-retire__main-panel-map', { timeout: 30_000 })
  await screenshotWtrRegion(page, path.join(outDir, 'wtr-preview.png'))

  await browser.close()
  console.log('Saved screenshots to', outDir)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
