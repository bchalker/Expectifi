# Expectifi Financial Calculation Audit

**Date:** 2026-07-17  
**Scope:** Read-only audit of retirement projections, market scenarios, Where to Retire / destination explorer, tax models, Social Security / pensions, and confidence / estimate indicators.  
**Constraint:** No application code was modified. “Last updated” dates are latest git commit dates for the cited file unless noted as dataset metadata.

**Primary orchestrator:** `client/src/lib/computeResults.ts` → `computeResults()`  
**Shared math:** `shared/calc.js`, `shared/constants.js`, `shared/filingStatusTax.js`

---

## Red Flags

1. **Federal tax constants are hardcoded 2024 values** in `shared/filingStatusTax.js`, not loaded from a `tax_constants` DB table as product rules claim. As of mid-2026 they are two tax years stale.
2. **Personal fixture data remains in `shared/constants.js`:** example account balances (`BAL_TRAD_*`, Roth, HSA), `HOME_EQUITY = 250000`, and SSA-style benefit dollars haircut by `SS_FACTOR = 0.75`. Solvency is not a user setting.
3. **`annualContributions = c.save * 12` in `taxBreakdownForecast.ts`:** `inputs.save` is already annual USD → growth-phase tax narrative can **overstate contributions 12×**.
4. **Brokerage tax-drag formula** `brkBal * brkRate * 0.02 * 0.18` likely double-counts return vs taxable yield (hardcoded heuristic, not linked to `calcTaxDetailed`).
5. **Income-mode withdraw display includes `(1 + wdInflation)` but `accountIncomeTax.ts` does not** when aggregating withdraw dollars for tax → tax can understate vs hero income when inflation > 0.
6. **Life-event portfolio delta is forced to `0` in `App.tsx`** (`portfolioDelta: 0` with comment that Life Events are commented out) — event FV math exists but does not change hero results.
7. **Italy 7% flat tax applied nationwide** in fit/score math; UI caveat mentions southern towns &lt;20k but does not change calculations. Statute labeled **Art. 24-bis** in `retireRegions.ts` vs **Art. 24-ter** everywhere else.
8. **Portugal scored as a 7% tax haven** via `TAX_FAVORABLE_US_RETIREE_COUNTRIES` / `FLAT_TERRITORIAL_COUNTRIES` even though `retirement-tax-visa.json` (metadata 2026-05) says NHR closed and pensions face progressive rates up to 48%. Parallel tables still use ~20% or NHR copy.
9. **International tax sources disagree by large margins** for the same country (e.g. Costa Rica 0% vs 10%; France 20% / 10% / 25%; Netherlands 36% vs 18%).
10. **Cost-of-living CSV has no refresh pipeline and no provenance stamp**; `data_quality` column is parsed then never used. Prices are static USD with **no inflation** in the map explorer.
11. **Two COL models for “monthly cost”:** full lifestyle basket (`calculateMonthlyBudget`) vs simplified catalog `rent + utilities + transport + meal×45` in combined destinations JSON — same city can disagree by surface.
12. **Market “scenarios” are not Monte Carlo or historical backtests** — hand-authored deterministic curves. Copy cites 1970s / 2000s / 2013–17 without a data pipeline. Stagflation labeled “−2% real” but applied as a **nominal** −0.02 on the slider.
13. **Holding outlook presets are slider-anchored; account-bucket presets are absolute** for the same labels → same “Bear” choice means different rates.
14. **Calendar length mismatch:** modeling years length `h` vs chart / per-year UI often `h+1`.
15. **LTCG UI advertises 0% / 15% / 20%**; tax engine only ever applies **0% or 15%**.
16. **Canada locale tax config is display-only**; dollar tax still runs the US `calcTaxDetailed` model.
17. **Withdrawal ordering is educational only** — no sequential drawdown or RMD dollar formula.
18. **Uniform placeholders in destination scoring:** every country in tax-visa data has `disaster_risk_score: 35` and `stability_score: 65`; climate normals cover only ~28 cities so most map climate scores fall back to 50.
19. **SS timing drawer (`computeSSTiming`) ignores user SSA estimates**, uses hardcoded `ssFromAge()` constants and fixed start year **2033**.
20. **Bucket tax/withdrawal splits use today’s trad/Roth/HSA mix on projected `retFV`** — documented AUDIT comment; wrong when bucket growth rates diverge.

---

## 1. Core compounding primitives

### 1.1 `fv` / `fvAnnuity`

1. **Location** — `shared/calc.js` → `fv()`, `fvAnnuity()`
2. **Purpose** — Compound a present balance; future value of equal annual contributions.
3. **Inputs** — `pv` / `pmt` (USD, annual for contributions), `r` (decimal annual return), `n` (years).
4. **Formula/logic**
   - `fv = pv * (1+r)^n`
   - `fvAnnuity = pmt * ((1+r)^n - 1) / r` (or `pmt * n` if `r = 0`)
5. **Data source** — Pure math; rates/balances from user inputs.
6. **Last updated** — 2026-06-06 (file); core lines blamed ~2026-05-15.
7. **Assumptions baked in** — Discrete annual compounding; ordinary (end-of-year) annuity for closed-form `fvAnnuity`.
8. **Known limitations or TODOs** — Market-scenario annuity path uses beginning-of-year style `(bal + pmt) * (1+r)`, so Base vs scenario contribution timing differs slightly.

### 1.2 `calcPortfolioAtRetirement`

1. **Location** — `shared/calc.js` → `calcPortfolioAtRetirement()`
2. **Purpose** — Baseline growth-phase portfolio at retirement (lump retirement + savings annuity + brokerage).
3. **Inputs** — `retBal`, `brkBal` (USD today’s balances); `save` (USD annual contribution); `retRate`, `brkRate` (decimal annual); `years` (default `YEARS` = 7 from constants, overridden by compute).
4. **Formula/logic**
   - `retBalanceFV = fv(retBal, retRate, years)`
   - `savingsFV = fvAnnuity(save, retRate, years)`
   - `retFV = retBalanceFV + savingsFV`
   - `brkFV = fv(brkBal, brkRate, years)`
   - `totalFV = retFV + brkFV`
5. **Data source** — User / plan inputs via `computeResults`.
6. **Last updated** — 2026-06-06.
7. **Assumptions baked in** — Single blended rate per sleeve; savings earn at `retRate` only.
8. **Known limitations or TODOs** — Default `YEARS = 7` is legacy “55→62”; live horizon is DOB-driven.

---

## 2. Growth-phase retirement projections (orchestrator)

### 2.1 `computeResults` growth path

1. **Location** — `client/src/lib/computeResults.ts` → `computeResults()`
2. **Purpose** — End-to-end snapshot: ages, FVs, income, tax, SS, regions, strategy side panels.
3. **Inputs** — `CalculatorInputs` (balances, rates, ages, SS, filing status, market/account/holding scenarios, etc.) + `CalculatorUi` + balance modes; imported CSV positions from local storage.
4. **Formula/logic (growth)**
   - `currentAge = clampedAgeFromDob(dateOfBirth)`
   - `yearsToRetirement = clamp(round(targetRetirementAge - currentAge), 1, 50)`
   - `retirementCalendarYear = currentYear + (targetRetirementAge - currentAge)`
   - Baseline: `calcPortfolioAtRetirement(...)`
   - If market scenario ≠ base: recompute savings with `fvAnnuityWithYearlyRates`; lump balances with `fvWithYearlyRates`
   - Imported holdings: per-position `projectPositionAtRetirement(projectionModelForHolding(...))` + residual lump
   - Manual buckets: `projectAccountBucketBalanceAtRetirement` per pretax/Roth/HSA/brokerage
   - Precedence: **holding custom → account bucket → global market scenario → slider**
5. **Data source** — User plan JSON / local storage; CSV import; not a market-data API.
6. **Last updated** — 2026-07-15.
7. **Assumptions baked in** — Annual steps; default suggestion rates from `initialCalculatorInputs.ts` (`retRate`/`brkRate` 7%, `wdRate` 4%, `wdInflation` 2.5%, `incYield` 6%, `incGrowth` 1%).
8. **Known limitations or TODOs** — Inline AUDIT comment: tax/withdrawal bucket ratios use **today’s** mix on projected `retFV`. Phantom balances zeroed by `activePortfolioBalances` when import/manual modes lack data.

### 2.2 Per-holding projection

1. **Location** — `client/src/lib/positionReturnModel.ts` → `projectPositionAtRetirement()`, `calcPositionFV()`, `SCENARIO_PRESETS`
2. **Purpose** — Grow an imported line item with flat, per-year, or outlook-preset rates.
3. **Inputs** — `currentValue` (USD); `yearlyReturns` (decimal per year); `flatRate`; horizon years; optional scenario id.
4. **Formula/logic** — `v *= (1 + rateᵢ)` each year; pad short paths with `flatRate` or last preset year. Presets (percent points, length 7): e.g. bear `[-5,-3,2,4,5,5,5]`, bull `[15,20,18,12,10,8,7]`, etc.
5. **Data source** — Hardcoded presets; user overrides stored on plan.
6. **Last updated** — 2026-06-04 (file); presets introduced ~2026-05-15.
7. **Assumptions baked in** — Absolute preset paths unless anchored (see scenarioRates); no dividends/tax during growth.
8. **Known limitations or TODOs** — Not historical returns; display “±4%” modifiers in UI differ from actual multi-year preset ranges.

### 2.3 Account-bucket scenarios

1. **Location** — `client/src/lib/accountReturnScenario.ts` → `projectAccountBucketBalanceAtRetirement()`, `projectionModelForHolding()`
2. **Purpose** — Override returns for brokerage / pretax / Roth / HSA lumps or cascade into holdings.
3. **Inputs** — Bucket balance (USD); account scenario yearly path; blended slider rate; horizon; optional market scenario id.
4. **Formula/logic** — Build ephemeral position model; apply holding → account → market → slider; then `projectPositionAtRetirement`.
5. **Data source** — `inputs.accountReturnScenarios` on plan.
6. **Last updated** — 2026-06-18.
7. **Assumptions baked in** — Account outlook presets are **absolute** (not slider-anchored), unlike holdings.
8. **Known limitations or TODOs** — Cascade audit helpers include `console.log` for debugging; not part of FV math.

### 2.4 Anchored holding outlook rates

1. **Location** — `client/src/lib/scenarioRates.ts` → `globalRelativeScenarioRates()`
2. **Purpose** — Shape holding outlook curves relative to the user’s global slider.
3. **Inputs** — Scenario id; `globalBlended` (decimal); horizon.
4. **Formula/logic** — `rateᵢ = globalBlended + (presetᵢ − basePresetᵢ)`
5. **Data source** — `SCENARIO_PRESETS` from `positionReturnModel.ts`.
6. **Last updated** — 2026-06-18.
7. **Assumptions baked in** — Anchors to the “base” preset path shape, not to historical mean.
8. **Known limitations or TODOs** — Account scenarios skip this anchoring.

---

## 3. Retirement income / drawdown (aggregate and per-account)

### 3.1 Growth-mode global withdrawal

1. **Location** — `client/src/lib/computeResults.ts` (non–`incomeMode` branch)
2. **Purpose** — First-year portfolio draw used for hero income when strategies are off.
3. **Inputs** — `totalFV` (USD at retirement); `wdRate` (decimal annual); `wdInflation` (decimal uplift).
4. **Formula/logic**
   - `annWd = totalFV * wdRate * (1 + wdInflation)`
   - `monPort = annWd / 12`
   - Split: `retWdAnn = annWd * (retFV / portSum)`, `brkWdAnn = annWd * (brkFV / portSum)`, then × today’s `tradRatio` / `rothRatio` / `hsaRatio`
5. **Data source** — User sliders / defaults.
6. **Last updated** — 2026-07-15.
7. **Assumptions baked in** — Inflation is a one-time uplift on year-1 withdrawal, not a multi-year COLA schedule in the hero figure.
8. **Known limitations or TODOs** — No sequence risk in this path except via growth FV scenarios; no RMD math.

### 3.2 Per-account income strategies

1. **Location**
   - `client/src/lib/accountIncomeMonthly.ts` → `monthlyPortfolioIncomeFromAccountStrategies()`
   - `client/src/lib/accountIncomeStrategy.ts` → `computeAccountIncomeBreakdown()`, runway helpers
   - `client/src/lib/accountBucketRetirementBalance.ts` → `accountRetirementBalance()`
2. **Purpose** — Income-mode monthly portfolio income by account: dividend, withdraw, both, or none.
3. **Inputs** — Projected account FV (USD); strategy; fund ticker; withdraw rate (0.5%–10%); `wdInflation`; optional HSA medical annual draw.
4. **Formula/logic**
   - Balance at retirement: `bucketFv * (accountCurrent / bucketCurrent)`
   - Dividend: `balance * (yield_est%/100) / 12`
   - Withdraw: `(balance * withdrawRate * (1 + wdInflation)) / 12`
   - Both: dividend + withdraw
   - HSA withdraw: first-year medical draw = `min(fallbackRetWdAnn * hsaRatio, hsaAtRetirement)` / 12
   - Runway: deplete with escalating draw `draw *= (1+inflation)`; for both, also subtract `balance * navErosion`
5. **Data source** — Fund yields / NAV risk from `client/src/data/income_securities.json` via `incomeSecurities.ts` (static estimates).
6. **Last updated** — Monthly 2026-06-11; strategy 2026-06-10; bucket FV 2026-06-02.
7. **Assumptions baked in** — Default withdraw 4% (2% when both); NAV erosion map by risk label (Very Low ~0.2% … Very High ~7%/yr); runway capped at 100 years.
8. **Known limitations or TODOs** — Withdrawal order in `withdrawalDisplayOrder.ts` is UI-only; dollars are not drawn sequentially across accounts.

### 3.3 Income-phase path (`calcIncomePhase`)

1. **Location** — `shared/calc.js` → `calcIncomePhase()`
2. **Purpose** — Illustrate portfolio and yield income at ages 62 / 70 / 80 (labels are ages; start = `targetRetirementAge`).
3. **Inputs** — `totalFV`; `incYield`, `incGrowth` (decimals); `wdRate`, `wdInflation`; `totalSSMonthly`; `ssIncluded`; `guaranteedSources[]`; `retirementStartAge`.
4. **Formula/logic**
   - `reinvestRate = incYield + incGrowth`
   - `port(age) = totalFV * (1+nav)^(age-start) + phased guaranteed FV at reinvestRate` (or simple SS annuity if no source list)
   - `incXX = portXX * yield / 12`
   - `wdMon = totalFV * wdRate * (1+wdInflation) / 12`
5. **Data source** — User income presets + guaranteed income config.
6. **Last updated** — 2026-06-06.
7. **Assumptions baked in** — Guaranteed income is **reinvested into the portfolio** for this projection (not spent). Independent of market-scenario yearly paths.
8. **Known limitations or TODOs** — Age labels `port62/70/80` are historical HTML names; start age can be ≠ 62.

### 3.4 Portfolio guidance / stress

1. **Location** — `client/src/lib/portfolioGuidance.ts` → `computePortfolioGuidanceMetrics()`
2. **Purpose** — Blended yield, goal coverage, 30% balance stress, aggregate runway.
3. **Inputs** — Snapshot income/tax fields + account income context.
4. **Formula/logic** — `blendedYield = annWd / totalFV`; reduced balance = 70% of FV; runway via `principalRunwayYears` on withdraw/both accounts only.
5. **Data source** — Derived from `computeResults` + strategies.
6. **Last updated** — ~2026-06-02.
7. **Assumptions baked in** — 30% stress is fixed, not probabilistic.
8. **Known limitations or TODOs** — Dividend-only accounts excluded from runway aggregate.

### 3.5 Retirement-age sensitivity table

1. **Location** — `client/src/lib/retirementAgeSensitivity.ts`
2. **Purpose** — Compare portfolio / monthly income at set age ±2 years.
3. **Inputs** — Full calculator inputs; re-runs `computeResults` at each age.
4. **Formula/logic** — For sensitivity monthly income: `(portfolio * wdRate)/12 + SS_at_age` (does **not** apply `wdInflation` uplift used in hero growth path).
5. **Data source** — Same engine + user SS FRA.
6. **Last updated** — unknown (not in core date batch; logic present in tree).
7. **Assumptions baked in** — SS only if configured and age ≥ 62; uses FRA→claim scaling.
8. **Known limitations or TODOs** — Income definition diverges from hero (`wdInflation` omitted).

---

## 4. Market scenarios / sequence-of-returns modeling

**Verdict:** No Monte Carlo, no historical return series, no DB-backed market data for returns. “Sequence” = deterministic year-by-year rate paths.

### 4.1 Macro market scenarios

1. **Location** — `client/src/lib/marketScenario.ts` → `MARKET_SCENARIOS`, `resolveGlobalMarketScenarioRates()`, `fvWithYearlyRates()`, `fvAnnuityWithYearlyRates()`
2. **Purpose** — Dashboard-wide overlay on holdings still using the global tier.
3. **Inputs** — Scenario id; `globalBlendedRate` (decimal); horizon years.
4. **Formula/logic**
   - Flat: `rateᵢ = globalBlendedRate + flatModifier` for all years  
     (`bull +0.03`, `bear −0.04`, `stagflation −0.02`, `base 0`)
   - Curve: `rateᵢ = globalBlendedRate + curveOffsetsPct[i]/100`; after curve ends, **last offset repeats**  
     (`lost_decade`, `recession_recovery`)
   - Compound: product of `(1+rᵢ)`; annuity: `(bal + pmt) * (1+r)` each year
5. **Data source** — Hardcoded constants in file; selection stored on `CalculatorInputs.marketScenario`.
6. **Last updated** — 2026-07-16.
7. **Assumptions baked in** — Illustrative regimes only; applied to global-tier assets; overrides ignore macro.
8. **Known limitations or TODOs** — Stagflation “real” label vs nominal application; `marketScenarioActive` flag is largely dead for compute since ~2026-07-12 (non-base id implies active). Comments still describe a pause toggle.

### 4.2 Chart / sparkline projection

1. **Location** — `client/src/lib/marketScenarioProjection.ts` → `buildMarketScenarioProjectionSeries()`; UI `MarketScenarioSparkline.tsx`
2. **Purpose** — Year-by-year Base vs scenario portfolio totals for charts.
3. **Inputs** — Sleeve balances, annual save, rates, horizon, scenario id; optional terminal totals from live `totalFV`.
4. **Formula/logic** — Each year: `ret += save; ret *= (1+r_ret); brk *= (1+r_brk)`; then optionally morph series so endpoint matches engine `totalFV` while preserving shape.
5. **Data source** — Same hardcoded market rates; terminals from `computeResults`.
6. **Last updated** — ~2026-06-01 (introduced with market scenarios).
7. **Assumptions baked in** — Mid-path is a simplified 2-sleeve model; custom holding overrides may not appear year-by-year in the curve.
8. **Known limitations or TODOs** — `growthPhaseProjectionYears` length `h+1` vs modeling years length `h`.

### 4.3 Growth scenario range card

1. **Location** — `client/src/lib/growthScenarioRangePreview.ts` (+ UI card)
2. **Purpose** — Pessimistic / expected / optimistic portfolio wings.
3. **Inputs** — Live expected FV; global-tier principal; anchored very_bear / very_bull paths.
4. **Formula/logic** — Wings apply only to global-tier principal; curve macros may collapse to arithmetic mean for display.
5. **Data source** — Hardcoded presets + live `totalFV`.
6. **Last updated** — ~2026-06-04 / 2026-06-18.
7. **Assumptions baked in** — Custom holdings / account scenarios excluded from wings.
8. **Known limitations or TODOs** — Arithmetic mean vs geometric annualized collapse inconsistency with holding path collapse.

### 4.4 Named plan “scenarios” API (not market data)

1. **Location** — `server/index.ts` `/api/scenarios`; table `scenarios` in `server/db.ts`
2. **Purpose** — Persist named user plan snapshots (`inputs` JSONB).
3. **Inputs** — User id, name, full calculator inputs JSON.
4. **Formula/logic** — CRUD storage only; no return-series computation.
5. **Data source** — PostgreSQL `scenarios` table.
6. **Last updated** — unknown (server plumbing; not return math).
7. **Assumptions baked in** — Market/account/holding scenario fields travel inside JSON, not separate market tables.
8. **Known limitations or TODOs** — Name collision with “market scenario” product language.

### 4.5 Legacy rate table in `computeResults.scenarios`

1. **Location** — `computeResults.ts` mapping `SCENARIOS` from `shared/constants.js` = `[6,12,18,24,40,55]`
2. **Purpose** — Side table of FVs / incomes at discrete constant rates.
3. **Inputs** — Same balances; rate from list (% → decimal).
4. **Formula/logic** — Re-grows retirement+savings at each rate; **keeps main-path `brkFV`** (not re-grown at scenario rate).
5. **Data source** — Hardcoded list.
6. **Last updated** — constants file 2026-07-09.
7. **Assumptions baked in** — Extreme rates (40%, 55%) are illustrative.
8. **Known limitations or TODOs** — Brokerage not re-projected at the scenario rate.

---

## 5. Social Security, pensions, and guaranteed income

### 5.1 Household SS benefit interpolation

1. **Location** — `client/src/lib/socialSecurity.ts` → `benefitAtClaimAge()`, `computeHouseholdSs()`, `resolveSpouseBenefit()`
2. **Purpose** — Monthly SS at claim ages; spouse own vs spousal; survivor callout.
3. **Inputs** — User/spouse `ssBenefit62/67/70` (USD/month); claim ages; married flag; spouse own-earnings flag.
4. **Formula/logic**
   - Linear interpolate 62→67 and 67→70
   - From FRA alone: `b62 = round(b67*0.7)`, `b70 = round(b67*1.24)`
   - Spouse = max(own at claim, 50% of user at claim)
5. **Data source** — User-entered SSA estimates; defaults from `shared/constants.js` when empty.
6. **Last updated** — 2026-05-25.
7. **Assumptions baked in** — Simplified SSA bend factors; no COLA; no earnings test; survivor = max of the two benefits + portfolio.
8. **Known limitations or TODOs** — Defaults embed 75% solvency haircut (see constants).

### 5.2 Shared SS defaults / solvency

1. **Location** — `shared/constants.js` (`SS_FACTOR`, `SS_62/67/70`, `SP_SS_*`); `shared/calc.js` → `ssFromAge()`, `spouseSSFromAge()`
2. **Purpose** — Fallback benefit schedule and SS timing drawer math.
3. **Inputs** — Age integer; constants derived from example SSA amounts × 0.75.
4. **Formula/logic** — Same linear age interpolation as client; `SS_xx = round(raw * 0.75)`.
5. **Data source** — Hardcoded; UI copy references “SSA projected × 75%”.
6. **Last updated** — constants file 2026-07-09; SS lines blamed ~2026-05-15.
7. **Assumptions baked in** — Solvency factor fixed at 75%; not user-configurable despite product language.
8. **Known limitations or TODOs** — Fixture balances / home equity in same file are personal-prototype leftovers.

### 5.3 Guaranteed income (SS / CPP / OAS / pension / annuity)

1. **Location** — `client/src/lib/guaranteedIncome.ts`
2. **Purpose** — Unify government + supplemental sources; monthly amount active at an age.
3. **Inputs** — Entries with type, `monthlyAmount` (USD/month nominal), `startAge`; residence country; SS fields for primary gov benefit.
4. **Formula/logic**
   - `guaranteedIncomeMonthlyAtAge = Σ sources where startAge ≤ age`
   - US primary SS / CA CPP scaled from FRA via SS claim-age helpers
   - OAS flat user monthly; spouse SS appended for married US
   - In `computeResults`: `totalSS = configured ? monthlyAt(retirementAge) : 0`
5. **Data source** — User input; locale labels in `localePensionConfig.ts`.
6. **Last updated** — 2026-06-09.
7. **Assumptions baked in** — No COLA; CPP uses US-style 62/67/70 scaling (not CPP actuarial factors).
8. **Known limitations or TODOs** — Canadian tax treatment of CPP/OAS not applied in dollar tax engine.

### 5.4 SS timing drawer

1. **Location** — `computeResults.ts` → `computeSSTiming()`
2. **Purpose** — Cumulative claim-age breakeven table with reinvestment rate.
3. **Inputs** — `ssInvestPct` (% → decimal); benefits from **`ssFromAge` constants**, not user SSA fields; start year **2033**.
4. **Formula/logic** — For each target age, accumulate `ssMonthly * 12 * (1+r)^(years)` from claim start.
5. **Data source** — Hardcoded benefit schedule + user invest %.
6. **Last updated** — with `computeResults` (2026-07-15).
7. **Assumptions baked in** — Fixed 2033 base year; ignores user’s entered benefits.
8. **Known limitations or TODOs** — Major consistency gap vs household SS model.

### 5.5 SS taxation (federal)

1. **Location** — `shared/filingStatusTax.js` → `ssTaxableFromProvisional()`; used in `calcTaxDetailed`
2. **Purpose** — Portion of SS included in taxable ordinary income.
3. **Inputs** — Annual SS; provisional income; filing status.
4. **Formula/logic** — MFS → always 85%; else jump to 0% / 50% / 85% of full SS at thresholds `$25k/$34k` (single/HOH) or `$32k/$44k` (MFJ). Not the IRS worksheet phase-in.
5. **Data source** — Hardcoded `SS_PROVISIONAL_2024`.
6. **Last updated** — 2026-06-01.
7. **Assumptions baked in** — Provisional in tax = `tradWd + brkGain + 0.5*ssAnn` (omits many AGI items).
8. **Known limitations or TODOs** — Separate UI headroom bar uses `halfSS + other` — different basis than tax provisional.

---

## 6. Federal / state / international tax

### 6.1 `calcTaxDetailed` / `calcTax`

1. **Location** — `shared/calc.js` + `shared/filingStatusTax.js`
2. **Purpose** — Annual federal tax estimate for dashboard / harvest / scenarios.
3. **Inputs** — Annual trad/roth/hsa/brk withdrawals (USD); monthly SS; filing status.
4. **Formula/logic**
   - `brkGain = brkWd * 0.60`
   - `provisional = tradWd + brkGain + ssAnn * 0.5`
   - `ssTaxable` via thresholds
   - `ordinaryIncome = max(0, tradWd + ssTaxable − stdDed)`
   - Progressive ordinary tax on 2024 brackets
   - `ltcgRate = 0.15 if ordinary+brkGain > LTCG_0 threshold else 0` (**never 20%**)
   - `totalTax = ordTax + ltcgTax`
5. **Data source** — Hardcoded 2024 brackets / std deductions / LTCG thresholds (not DB).
6. **Last updated** — filingStatusTax 2026-06-01; calc.js 2026-06-06.
7. **Assumptions baked in** — 60% of brokerage withdrawal is taxable LTCG; Roth/HSA never taxed; no state tax; no NIIT; no AMT; default filing status **single**.
8. **Known limitations or TODOs** — Stale tax year; `taxConfig.ts` advertises MFJ default and 0/15/20% LTCG for copy only.

### 6.2 Account-strategy tax aggregation

1. **Location** — `client/src/lib/accountIncomeTax.ts` → `aggregateActiveAccountIncomeForTax()`, `calcTaxDetailedForAccountStrategies()`
2. **Purpose** — Build tax buckets from active dividend/withdraw strategies, then call shared tax.
3. **Inputs** — Projected balances; fund yields; withdraw rates; HSA medical draw; SS monthly; filing status.
4. **Formula/logic** — Dividend annual = `balance * yield%/100`; withdraw annual = `balance * rate` (HSA = medical draw); **no `(1+wdInflation)`**.
5. **Data source** — Same as income strategies + shared tax.
6. **Last updated** — 2026-06-03.
7. **Assumptions baked in** — Only accounts with an active fund or withdraw input contribute.
8. **Known limitations or TODOs** — Inflation mismatch vs displayed withdraw income.

### 6.3 Growth-phase forecast tax drag

1. **Location** — `client/src/lib/taxBreakdownForecast.ts` → `calcForecastGrowthTaxDetail()`
2. **Purpose** — Narrative “tax drag” while accumulating.
3. **Inputs** — Current brokerage balance; `brkRate`; `save`.
4. **Formula/logic** — `brokerageTaxDragAnnual = brkBal * brkRate * 0.02 * 0.18`; `annualContributions = c.save * 12`.
5. **Data source** — Hardcoded 2% taxable yield × 18% effective rate.
6. **Last updated** — file touched 2026-07-15; heuristic ~2026-06-09.
7. **Assumptions baked in** — Independent of `calcTaxDetailed`.
8. **Known limitations or TODOs** — `save * 12` unit bug if `save` is already annual.

### 6.4 Locale tax config (display)

1. **Location** — `client/src/config/taxConfig.ts`
2. **Purpose** — US/CA labels, withdrawal-order copy, MFJ-shaped marginal display rates, disclaimers.
3. **Inputs** — Onboarding locale.
4. **Formula/logic** — Lookup tables; not used for dollar tax in `calcTaxDetailed`.
5. **Data source** — Hardcoded US 2024-ish MFJ brackets; CA federal marginals / BPA 15,705.
6. **Last updated** — ~2026-05-25.
7. **Assumptions baked in** — Default US filing label MFJ vs engine default single.
8. **Known limitations or TODOs** — Canada dollar tax still US federal model.

### 6.5 US state tax tables

1. **Location** — `client/src/data/stateTaxRates.ts` (+ `stateRetirementTaxDetail.ts`)
2. **Purpose** — Planning rates / exemptions for destination catalog and WTR state UI.
3. **Inputs** — State code; income not modeled progressively.
4. **Formula/logic** — Display `retirementIncomeRate` and narrative; **not** subtracted in federal engine.
5. **Data source** — Hardcoded; `lastVerified: '2025-01'`; Tax Foundation URL cited.
6. **Last updated** — ~2026-05-17.
7. **Assumptions baked in** — Simplified effective rates, not full state worksheets.
8. **Known limitations or TODOs** — Stale verification stamp; unused in hero tax dollars.

### 6.6 International effective rates — `getEffectiveTaxRate` / `calcFit`

1. **Location** — `client/src/lib/retirementFormulas.ts` → `getEffectiveTaxRate()`, `calcFit()`, `calcFitScore()`
2. **Purpose** — Net income after local tax; surplus vs COL; visa qualify; fit score for catalog cities.
3. **Inputs** — Country ISO; `grossMonthly` USD; city COL via `calculateMonthlyBudget`; catalog visa requirement.
4. **Formula/logic**
   - `taxAmount = grossMonthly * rate` (Italy 7%, Greece 7%, Panama 0%, default unknown 20%, …)
   - `net = gross − tax`; `surplus = net − trueCOL`
   - `visaQualifies = net ≥ visa.income_requirement_monthly_usd`
   - Fit score blends surplus ratio, QoL, healthcare, visa, English
5. **Data source** — Hardcoded rate map (comment: verified 2026-05; sources Greenback / Taxes for Expats / IRS treaties / etc.); catalog JSON for visa/QoL.
6. **Last updated** — 2026-06-15.
7. **Assumptions baked in** — Approximate effective rate at ~$3k–$8k/mo gross; US federal still owed (not netted); Italy 7% for all Italian cities.
8. **Known limitations or TODOs** — `cityFitCaveats` warns on Italy eligibility but does not change math; progressive regimes simplified.

### 6.7 Country tax rates table

1. **Location** — `client/src/data/countryTaxRates.ts` + `countryRetirementTaxDetail.ts`
2. **Purpose** — Destination tax panel math / narrative / health insurance estimate.
3. **Inputs** — ISO code; monthly income for `localTax = income * effectiveRetirementRate`.
4. **Formula/logic** — Flat effective rate × income; detail narratives per income type.
5. **Data source** — Hardcoded; health from `healthInsuranceByIso.json`; detail `lastVerified` often 2025-01.
6. **Last updated** — detail tables ~2026-05; rates module present in tree.
7. **Assumptions baked in** — One rate on all gross; ignores income mix; Portugal copy may still mention NHR.
8. **Known limitations or TODOs** — Conflicts with `getEffectiveTaxRate` and score haircuts (CR/FR/NL/etc.).

### 6.8 Retire-regions strip (Italy scenario still present)

1. **Location** — `client/src/lib/calc/retireRegions.ts` → `computeRetireRegionComparison()`; UI `RetireRegionsBody.tsx`
2. **Purpose** — Compare up to 5 curated countries: COL, COL inflation, simplified local tax, surplus vs US tax.
3. **Inputs** — Gross annual USD; US tax annual; user monthly COL USD; region id.
4. **Formula/logic**
   - Local tax = `gross * localFlatTaxRate` (Italy **0.07**, Greece 0.07, Portugal 0.20, Spain 0.19, France 0.25; several null = $0 local)
   - US row uses `usTaxAnnual`
   - `afterTaxMonthly = (gross − localTax) / 12`
   - `surplus = afterTaxMonthly − monthlyCostUsd`
   - `projectedCost(years) = cost * (1 + annualColInflation)^years`
5. **Data source** — Hardcoded catalog (default Italy COL $2800, inflation 2%, etc.); legacy `italyCost` migrates to Italy pick.
6. **Last updated** — 2026-05-16.
7. **Assumptions baked in** — Local tax only overseas (no FTC netting despite copy); Italy labeled **Art. 24-bis**; placeholders explicitly “not tax advice”.
8. **Known limitations or TODOs** — Parallel to map explorer; different COL and tax assumptions.

### 6.9 Retirement score tax haircut

1. **Location** — `client/src/utils/retirementScoreTax.ts` + `incomeTaxHaircut` in `retirementScore.ts`
2. **Purpose** — Tax factor for map pin scoring / effective income for affordability.
3. **Inputs** — Country name; tax-visa label; optional `COUNTRY_TAX_RATES`.
4. **Formula/logic** — Favorable set (Italy, Portugal, Panama, Paraguay, Georgia) → `taxScore=100`, `estimatedTaxRate=0.07`; else parse top rate from label → bands; haircut applied as `effectiveIncome = income * (1 − haircut)`.
5. **Data source** — Hardcoded sets + `retirement-tax-visa.json` strings.
6. **Last updated** — retirementScoreTax ~2026-06-11; retirementScore 2026-06-15.
7. **Assumptions baked in** — Portugal treated as 7% haven post-NHR closure (contradicts JSON).
8. **Known limitations or TODOs** — String parsing of rate labels is brittle.

---

## 7. Where to Retire / destination explorer

**Architecture:** No destination data in PostgreSQL. Static JSON/CSV in the client; live APIs only for FX (and climate detail). Two parallel UIs: map explorer (~900 cities) and retire-regions strip (10 countries).

### 7.1 City cost-of-living basket

1. **Location** — `client/src/utils/costOfLiving.ts` → `calculateMonthlyBudget()`, loaders for `cost-of-living.csv`
2. **Purpose** — Monthly USD lifestyle budget for a city.
3. **Inputs** — City prices (USD fields); `LifestyleInputs` (housing tier, dining intensity, spouse, insurance USD/mo, etc.).
4. **Formula/logic** — Rent (tier) + groceries×(1 or 1.6 spouse) + dining/alcohol + transit×adults + taxi×(start+5km) + utilities+internet + mobile + leisure + clothing/12×mult×adults + incidentals%×core + healthInsurance×adults; weeks/month = 4.33.
5. **Data source** — Static `client/src/data/cost-of-living.csv` (~922 rows; exclusions applied). Coords from `city-coordinates.json`. **No provenance / scrape date in CSV.**
6. **Last updated** — CSV + util 2026-06-15; first appear ~2026-05-20.
7. **Assumptions baked in** — Prices already USD; default insurance $250/mo; excluded countries/cities hardcoded.
8. **Known limitations or TODOs** — **No refresh script/cron**; **`data_quality` unused**; **no inflation** on map budgets; FX does not reprice basket.

### 7.2 Simplified catalog COL

1. **Location** — `client/src/data/retirement-destinations-combined.json` (+ loaders in `retirementDestinations.ts`)
2. **Purpose** — Curated city catalog fields (visa, tax labels, simplified base COL).
3. **Inputs** — Precomputed components in JSON.
4. **Formula/logic** — Approx `base = rent_1br_outside + utilities + transport_monthly + meal_inexpensive × 45` (+ health estimate).
5. **Data source** — Generated static JSON (meta ~2026-05; ~638 cities).
6. **Last updated** — ~2026-05-22.
7. **Assumptions baked in** — Meal×45 proxy for food; differs from full basket.
8. **Known limitations or TODOs** — Dual COL models without reconciliation.

### 7.3 Map retirement score

1. **Location** — `client/src/utils/retirementScore.ts` → `calculateRetirementScore()`; wiring `client/src/lib/whereToRetire/cityMapScoring.ts` → `scoreMapCity()`
2. **Purpose** — Preference-weighted 0–100 pin score + band colors.
3. **Inputs** — Monthly income USD; monthly budget; city/country; user preferences; climate normals when available.
4. **Formula/logic** — Tax haircut → effective income → `incomeFitScore = min(100, round(effectiveIncome/budget * 50))`; weighted blend of income fit, tax, healthcare cost/quality, safety, air, disaster, climate, political stability, social laws, daily life; hard caps/warnings.
5. **Data source** — QoL JSON, tax-visa JSON, preference field tables, climate normals (28 cities), Teleport fallbacks for some sorts.
6. **Last updated** — retirementScore 2026-06-15; cityMapScoring present in tree.
7. **Assumptions baked in** — Pin bands at 90 / 70 / 50; missing climate → score 50; disaster/stability often uniform placeholders.
8. **Known limitations or TODOs** — QoL sort path can use Teleport heuristics instead of Numbeo QoL used elsewhere; `calculateAffordabilityScore` (`income/budget*60`) is legacy/unused in map scoring.

### 7.4 Income-fit helper

1. **Location** — `client/src/lib/whereToRetire/retirementIncomeFitScore.ts`
2. **Purpose** — Income-only fit explanation strings.
3. **Inputs** — Monthly income; monthly budget.
4. **Formula/logic** — `min(100, round((income/budget)*50))` + threshold copy.
5. **Data source** — Derived.
6. **Last updated** — 2026-06-11.
7. **Assumptions baked in** — No tax haircut in this helper (haircut lives in full retirement score).
8. **Known limitations or TODOs** — Marked partially deprecated in favor of full score.

### 7.5 Currency conversion

1. **Location**
   - Client: `client/src/lib/api/exchangeRates.ts` (`getLocalCurrencyInfo`, `getUsdExchangeHistory`)
   - Server: `server/wiseExchangeRates.ts`, `server/exchangeRateRoutes.ts` → `GET /api/exchange-rates/:currencyCode`
   - UI: `DestinationExchangeRate.tsx`, `useDestinationLiveData.ts`
2. **Purpose** — Spot USD→local display and 10y dollar-strength series; **does not reprice COL**.
3. **Inputs** — ISO currency code; plan monthly income for display conversion.
4. **Formula/logic** — Spot: Wise auth → Wise public `/v3/quotes` → `open.er-api.com/v6/latest/USD`. History: Frankfurter `api.frankfurter.app/{start}..{end}?from=USD&to=SYM`, else spot. `localAmount = usd * rate`. Trend % = `(last−first)/first`.
5. **Data source** — Live APIs; server in-memory cache 5 min; client localStorage cache 24h (`apiCache.ts`).
6. **Last updated** — exchangeRates client + wise server 2026-06-15.
7. **Assumptions baked in** — Budgets remain USD; FX is educational.
8. **Known limitations or TODOs** — Dollar-strength sort uses **cached** series only; “purchasing power” card multipliers may use US/city basket ratio, not FX.

### 7.6 Inflation (destination)

1. **Location** — Map: none. Regions: `retireRegions.ts` `annualColInflation` + `projectedCostMonthlyUsd`.
2. **Purpose** — Project COL forward in the regions strip only.
3. **Inputs** — Years; hardcoded per-country inflation decimals (e.g. Italy 2.0%, Mexico 3.5%).
4. **Formula/logic** — `cost * (1+i)^years`.
5. **Data source** — Hardcoded; no verification source.
6. **Last updated** — 2026-05-16.
7. **Assumptions baked in** — Constant inflation forever; not linked to `wdInflation`.
8. **Known limitations or TODOs** — Map explorer static forever; high-inflation countries still use frozen USD prices.

### 7.7 Quality of life / healthcare / tax-visa datasets

| Dataset | Path | Source / metadata | Last updated | Role |
|---------|------|-------------------|--------------|------|
| QoL | `client/src/data/quality-of-life.json` | Numbeo 2024 + World Bank proxy; meta `last_updated: 2026-05` | git 2026-06-17 | Safety/healthcare/pollution/QoL indexes |
| Tax & visa | `client/src/data/retirement-tax-visa.json` | Greenback, Taxes for Expats, IL, IRS, State Dept; meta 2026-05 | git 2026-06-16 | Narratives, filters, scores |
| Healthcare ratings | `client/src/data/destinationHealthcare.ts` | Manual 0–100; “last reviewed 2025-01” | git 2026-05-17 | Sort “healthcare-access” |
| Teleport fallbacks | `client/src/data/teleportFallbacks.ts` | Manual COL/QoL 0–10; “2025-01” | unknown | Some QoL sorts |
| English proficiency | `client/src/data/english-proficiency.json` | EF EPI 2023 etc.; meta 2026-05 | unknown | Filters |
| Climate normals | `client/src/data/climate-normals.json` | Meta Open-Meteo 2011–2020; ~28 cities | meta 2026-06 | Map climate scores |
| Travel advisories | `client/src/data/travel-advisories.generated.json` | State Dept RSS; fetched 2026-06-16 | via `npm run refresh-travel-advisories` | Hide unsafe |
| Getting there | `client/src/data/getting-there.json` | Curated / Amadeus script; copy May 2026 | ~2026-06-13 | Flight filters |
| Health insurance by ISO | `client/src/data/healthInsuranceByIso.json` | Static monthly USD | ~2026-05-22 | Catalog health est |

**Refresh cadence:** Manual only for advisories/climate/flights. **No automated refresh** for COL, QoL, or tax-visa. Live climate detail uses Open-Meteo API with 24h client cache (`openMeteo.ts`).

### 7.8 Destination confidence / estimate UI

1. **Location** — `client/src/components/ui/DataConfidenceNote.tsx`; QoL tab; WTR footers; Terms.
2. **Purpose** — Label sourced vs heuristic data.
3. **Inputs** — Explicit props (`sourced` scope+dataset vs `heuristic`).
4. **Formula/logic** — Hardcoded strings only: `"{scope} · {dataset}"` or “Rough estimate, not tied to a specific dataset”.
5. **Data source** — Author-chosen props; not computed from `data_quality`.
6. **Last updated** — 2026-06-17.
7. **Assumptions baked in** — Almost no runtime data-quality score exists.
8. **Known limitations or TODOs** — `sourced` variant barely used; CSV `data_quality` ignored; tax “favorable” badges driven by hardcoded country sets, not live verification.

---

## 8. One-time / life events

### 8.1 Timeline projection

1. **Location** — `client/src/lib/calc/lifeEvents.ts` → `projectPortfolioTimeline()`, impact copy helpers
2. **Purpose** — Year-by-year portfolio with lump/recurring inflows/outflows.
3. **Inputs** — Balances, rates, annual save, event list (USD amounts, years).
4. **Formula/logic** — Each year add save to ret; apply event net prorated across sleeves; multiply by rates. Baseline (no events) rescaled to match `computeResults.totalFV`. Impact sentences use fixed `LIFE_EVENT_GROWTH_RATE = 0.08`.
5. **Data source** — Stored growth life events in local/plan state.
6. **Last updated** — ~2026-06-01.
7. **Assumptions baked in** — 8% for narrative impacts independent of user rates.
8. **Known limitations or TODOs** — **`App.tsx` applies `portfolioDelta: 0`** — hero results ignore active event deltas.

### 8.2 Instance impact (inheritance, sale, etc.)

1. **Location** — `client/src/components/life-events/instanceImpact.ts` + `life-events/utils.ts`
2. **Purpose** — FV impact rating for configured event instances (inheritance, sell property/business, pension lump sum, medical/HSA, divorce, etc.).
3. **Inputs** — Amount, year, growth rate, portfolio; optional taxRate (default 20% on sales), taxWithholding (default 22% pension lump).
4. **Formula/logic** — `FV = amount * (1+g)^(retireYear−eventYear)` (rounded); inflows negative FV convention for “boost”; rating by |FV|/portfolio thresholds.
5. **Data source** — User instances; defaults in `growthLifeEvents.ts`.
6. **Last updated** — growth life events storage present; mortgage helper 2026-06-09.
7. **Assumptions baked in** — Default sale tax 20%; pension withholding 22%; vacation property impact = 20% down payment.
8. **Known limitations or TODOs** — Not wired into live hero FV while delta forced to 0.

---

## 9. Confidence / estimate indicators (cross-cutting)

| UI / signal | Location | What actually drives it |
|-------------|----------|-------------------------|
| Subheader “estimate” | `SubHeader.tsx` CSS/chrome | Live computed monthly income from `computeResults` — **not** an accuracy score |
| Market scenario pill | SubHeader / context row | Avg offset of resolved macro rates vs slider |
| Growth range pessimistic–optimistic | Range card | Deterministic hardcoded wing presets |
| Allocation “ranges calibrated…” | Account scenario copy | **Copy only** — rates do not change by allocation profile |
| Custom-rate chips (S&P ~10%, etc.) | Holding/account UI | Hardcoded suggestion percents |
| Income NAV erosion note | Strategy education | Static map from fund risk label |
| `DataConfidenceNote` | QoL insurance heuristic (mainly) | Hardcoded string props |
| Tax “Effective rate X%” | Tax summary | Computed `totalTax / (trad+brk+ss)` |
| Harvest/Forecast “roughly” | Narrative builders | Soft language; forecast drag is heuristic |
| Pin band colors | `retirementScore.ts` | Score thresholds 90/70/50 |
| Tax badge “X% flat” | `taxBadgeLabel` | `getEffectiveTaxRate` (can label progressive ≤10% as “flat”) |
| Terms / footers | Legal + WTR sidebar | Static educational disclaimers |
| SyncStatus | Account sync | Sync age, not financial confidence |

**There is no statistical confidence interval or data-quality score on retirement FV or federal tax dollars.**

---

## 10. Key file index (git last-commit dates)

| Path | Role | Last commit |
|------|------|-------------|
| `shared/calc.js` | fv, tax, income phase, SS age | 2026-06-06 |
| `shared/constants.js` | SS×0.75, YEARS=7, fixture bals, SCENARIOS | 2026-07-09 |
| `shared/filingStatusTax.js` | 2024 brackets / provisional / LTCG | 2026-06-01 |
| `client/src/lib/computeResults.ts` | Orchestration | 2026-07-15 |
| `client/src/lib/marketScenario.ts` | Macro scenarios | 2026-07-16 |
| `client/src/lib/positionReturnModel.ts` | Holding FV / presets | 2026-06-04 |
| `client/src/lib/accountReturnScenario.ts` | Bucket cascade | 2026-06-18 |
| `client/src/lib/scenarioRates.ts` | Anchored outlook | 2026-06-18 |
| `client/src/lib/accountIncomeStrategy.ts` | Drawdown / runway | 2026-06-10 |
| `client/src/lib/accountIncomeMonthly.ts` | Aggregate monthly income | 2026-06-11 |
| `client/src/lib/accountIncomeTax.ts` | Strategy tax buckets | 2026-06-03 |
| `client/src/lib/socialSecurity.ts` | Household SS | 2026-05-25 |
| `client/src/lib/guaranteedIncome.ts` | SS/CPP/OAS/pension/annuity | 2026-06-09 |
| `client/src/lib/retirementFormulas.ts` | WTR fit / effective tax | 2026-06-15 |
| `client/src/lib/calc/retireRegions.ts` | Regions strip incl. Italy 7% | 2026-05-16 |
| `client/src/utils/costOfLiving.ts` | COL basket | 2026-06-19 |
| `client/src/utils/retirementScore.ts` | Map pin score | 2026-06-15 |
| `client/src/lib/api/exchangeRates.ts` | FX client | 2026-06-15 |
| `server/wiseExchangeRates.ts` | FX server | 2026-06-15 |
| `client/src/data/cost-of-living.csv` | City prices | 2026-06-15 |
| `client/src/data/retirement-tax-visa.json` | Tax/visa narratives | 2026-06-16 |
| `client/src/data/quality-of-life.json` | QoL indexes | 2026-06-17 |
| `client/src/data/destinationHealthcare.ts` | Healthcare sort ratings | 2026-05-17 |
| `client/src/components/ui/DataConfidenceNote.tsx` | Confidence labels | 2026-06-17 |
| `client/src/lib/taxBreakdownForecast.ts` | Growth tax drag narrative | 2026-07-15 |
| `client/src/config/taxConfig.ts` | Locale tax copy | ~2026-05-25 |

---

## 11. Assumptions common across models

- Discrete **annual** compounding unless noted.
- Money is **nominal USD** unless display-converted; destination COL is **not** FX-adjusted.
- Contributions (`inputs.save`) treated as **annual** USD in the engine.
- Core tax engine is **US federal only**; state and foreign tax are parallel planning layers.
- No RMD **dollar** formula; age only changes educational withdrawal order.
- Guaranteed income amounts are **nominal** (no COLA).
- Dividend yields and NAV erosion from **static** security catalog, not live market prices.
- Market / holding “scenarios” are **illustrative deterministic curves**, not probabilistic forecasts.

---

*End of audit. Documentation only — no code changes.*
