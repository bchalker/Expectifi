# CSV import test fixtures

Realistic fake position exports for manual and automated testing of the Expectifi CSV import flow (custodian selection → file selection → bucket mapping → import intent → confirm).

## Shared overlap tickers

**MU**, **NASA**, and **IBM** appear across Fidelity, Schwab, Vanguard, and Webull fixtures (brokerage bucket where applicable) so you can test multi-brokerage aggregation without deduplication:

| Ticker | Fidelity (Individual - TOD) | Schwab | Vanguard | Webull (Individual) |
|--------|----------------------------|--------|----------|---------------------|
| MU | $138,006 | $52,173 | $46,283 | $69,405 |
| NASA | $106,190 | $38,886 | $28,416 | $66,554 |
| IBM | $42,001 | $21,568 | $16,346 | $14,076 |

Fidelity also holds **IBM in Roth IRA** ($4,995) — same ticker, different tax bucket, kept as a separate row.

## Files

| File | Custodian | Holdings | Notes |
|------|-----------|----------|-------|
| `fidelity-sample.csv` | Fidelity | 10 | Multi-account; MU/NASA/IBM in brokerage |
| `fidelity-sample-update.csv` | Fidelity | 10 | MU value changed, MSFT added; SPAXX + FDTX removed |
| `schwab-sample.csv` | Charles Schwab | 8 | MU/NASA/IBM + Schwab funds |
| `vanguard-sample.csv` | Vanguard | 8 | MU/NASA/IBM + Vanguard funds |
| `webull-sample.csv` | Webull | 10 | Individual / IRA / Roth IRA; MU/NASA/IBM overlap |

## Column formats

### Fidelity (`fidelity-sample.csv`)

Matches Fidelity’s **Positions** export. The parser locates the first row containing a cell exactly `Symbol`.

Required columns (header names are case-insensitive after normalization):

- `Account Name` — repeated per row or carried from prior row
- `Symbol`
- `Description`
- `Current Value`
- `Cost Basis Total` (or `Total Cost Basis`) — optional but included in fixtures

Account names in the sample map to tax buckets via heuristics:

| Account Name | Expected bucket |
|--------------|-----------------|
| Individual - TOD | Brokerage |
| ROTH IRA | Roth |
| Traditional IRA | Pre-tax (401k/IRA) |
| 401K | Pre-tax (401k/IRA) |
| Health Savings Account | HSA |

### Charles Schwab (`schwab-sample.csv`)

Matches Schwab’s **Positions** export:

- Row 1: metadata (skipped)
- Row 2: headers — `Symbol`, `Description`, `Market Value`, `Cost Basis`, etc.
- Data rows follow; rows with empty `Symbol` or `Symbol` starting with `Totals` are skipped

All rows map to account `Individual · CSV import`. Assign **Brokerage / taxable** in the import review step.

### Vanguard (`vanguard-sample.csv`)

Matches Vanguard’s brokerage **Holdings** export:

- First row containing `Symbol` is the header row
- Required: `Symbol`, `Investment Name`, `Total Value`
- Cost basis column absent → parsed as `null`

All rows map to `Individual · CSV import`. Assign **Brokerage / taxable** when adding as a second source.

### Webull (`webull-sample.csv`)

Matches Webull’s **portfolio export**:

- First row containing `Ticker Symbol` is the header row
- Required: `Ticker Symbol`, `Name`, `Market Value`
- Optional: `Quantity`, `Last Price`, `Total Cost` (or `Average Cost`), `Account Type`

`Account Type` maps to tax buckets at parse time:

| Account Type | Expectifi bucket |
|--------------|------------------|
| Individual | Brokerage / taxable |
| IRA | Pre-tax (401k/IRA) |
| Roth IRA | Roth |

Individual, IRA, and Roth IRA rows use the account type as the account name in import review.

## Recommended test scenarios

### 1. Fresh Fidelity import

1. Open **Import CSV** → Fidelity → `fidelity-sample.csv`
2. Confirm bucket assignments for all five accounts
3. **Confirm** (no import-intent step on first import)

### 2. Add Vanguard, Schwab, and Webull (aggregation)

1. With Fidelity loaded, import `vanguard-sample.csv` → **Add from new source** → map to **Brokerage**
2. Import `schwab-sample.csv` → **Add from new source** → map to **Brokerage**
3. Import `webull-sample.csv` → **Add from new source** — buckets are pre-mapped from `Account Type` (confirm in review)
4. Verify:
   - **MU**, **NASA**, **IBM** each appear **four times** in brokerage (once per custodian) — not deduplicated
   - **IBM** also appears once in Roth (Fidelity) — five IBM rows total if all four brokerages + Fidelity Roth loaded
   - Webull **W** monogram appears on Webull account rows in the ticker breakdown popout
   - Brokerage bucket total = sum of all brokerage rows across all batches

### 3. Update existing Fidelity import

1. With all three loaded (or Fidelity only), import `fidelity-sample-update.csv`
2. Choose **Update existing**
3. Review diff summary:
   - **1 updated** — MU value changed ($138,006 → $141,533)
   - **1 added** — MSFT in Individual brokerage
   - **8 unchanged**
   - **2 removed** — SPAXX and FDTX; default **Keep**
4. Confirm with defaults — SPAXX and FDTX remain unless you choose **Remove**

## Automated validation

```bash
npx tsx scripts/validate-csv-import-fixtures.ts
```

## Bucket totals (Fidelity sample only)

Approximate calculator bucket sums from `fidelity-sample.csv`:

| Bucket | Approx. total |
|--------|---------------|
| Brokerage | $292,449 (MU + NASA + IBM + SPAXX) |
| Roth | $14,706 |
| Pre-tax | $11,243 |
| HSA | $3,630 |

Vanguard sample brokerage total ≈ **$124,371** when mapped to brokerage.  
Schwab sample brokerage total ≈ **$145,826** when mapped to brokerage.  
Webull sample totals ≈ **$160,425** Individual + **$14,184** IRA + **$11,251** Roth IRA (buckets assigned automatically).
