import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useUserLocale } from '../context/UserLocaleContext'
import {
  accountLabelForWithdrawalBucket,
  localeSupportsWithdrawalBucket,
  taxFreeWithdrawalLabels,
} from '../config/taxConfig'
import type { ComputedSnapshot, CalculatorInputs, CalculatorUi, DrawerName } from '../lib/computeResults'
import type { BalanceInputMode } from '../lib/retirementBalanceMode'
import type { BrokerageBalanceMode } from '../lib/brokerageBalanceMode'
import { pensionConfigForLocale } from '../lib/localePensionConfig'
import {
  buildWithdrawalStrategySteps,
  withdrawalExplainerDisclaimer,
} from '../lib/withdrawalStrategyContent'
import { fmt, fmtK, fmtMon } from '../utils/format'
import {
  ConfigDrawerTabPanels,
  ConfigDrawerTabProvider,
  ConfigDrawerTabs,
  type ConfigDrawerTab,
} from './ConfigDrawerBody'
import type { LifePlans } from '../lib/planStorage/life'
import { SidePanelShell } from './SidePanelShell'
import { AppButton } from './ui/AppButton'
import { BottomSheetPortal } from './ui/BottomSheetPortal'
import { useIsMobileBottomSheet } from '../hooks/useMobileBottomSheet'
import './PanelChrome.scss'

const TITLES: Record<DrawerName, string> = {
  scenarios: 'Return scenarios',
  sstiming: 'SS timing',
  taxfree: 'Tax-free withdrawals',
  strategy: 'Withdrawal strategy',
  config: 'Your Plans',
}

type Props = {
  drawer: DrawerName | null
  onClose: () => void
  c: ComputedSnapshot
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  balanceMode: BalanceInputMode
  onBalanceModeChange: (m: BalanceInputMode) => void
  brokerageMode: BrokerageBalanceMode
  onBrokerageModeChange: (m: BrokerageBalanceMode) => void
  positionsImportRev: number
  onImportedApplyBalances: (b: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onPositionsImportAppliedRetirement: () => void
  onPositionsImportAppliedBrokerage: () => void
  configInitialTab?: ConfigDrawerTab
  ssIncluded: boolean
  setUi: (p: Partial<CalculatorUi>) => void
  onOpenRegister?: () => void
  onResetGuestProfile?: () => void
  lifePlans: LifePlans
  onLifePlansChange: (next: LifePlans) => void
  currentYear: number
}

export function DrawerPanel({
  drawer,
  onClose,
  c,
  inputs,
  setInputs,
  balanceMode,
  onBalanceModeChange,
  brokerageMode,
  onBrokerageModeChange,
  positionsImportRev,
  onImportedApplyBalances,
  onPositionsImportAppliedRetirement,
  onPositionsImportAppliedBrokerage,
  configInitialTab,
  ssIncluded,
  setUi,
  onOpenRegister,
  onResetGuestProfile,
  lifePlans,
  onLifePlansChange,
  currentYear,
}: Props) {
  const open = drawer != null
  const isMobileSheet = useIsMobileBottomSheet()
  const lastDrawerRef = useRef<DrawerName | null>(null)
  if (drawer) lastDrawerRef.current = drawer
  const panelDrawer = drawer ?? lastDrawerRef.current
  const [ssBenefitError, setSsBenefitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) setSsBenefitError(null)
  }, [open])

  useEffect(() => {
    if (ssIncluded && inputs.ssBenefit67 > 0) setSsBenefitError(null)
  }, [ssIncluded, inputs.ssBenefit67])

  const onSsIncludedChange = (value: boolean) => {
    setUi({ ssIncluded: value })
    if (!value) setSsBenefitError(null)
  }

  const onConfigConfirm = () => {
    if (ssIncluded && inputs.ssBenefit67 <= 0 && !(inputs.guaranteedIncomeEntries?.some((e) => e.monthlyAmount > 0))) {
      setSsBenefitError('Enter your expected guaranteed income benefit.')
      return
    }
    setSsBenefitError(null)
    onClose()
  }

  const configFooter =
    panelDrawer === 'config' ? (
      <div className="drawer-config-footer">
        <AppButton
          type="button"
          size="md"
          variant="primary"
          className="drawer-config-footer__confirm"
          onPress={onConfigConfirm}
        >
          Confirm
        </AppButton>
      </div>
    ) : undefined

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const isConfigDrawer = panelDrawer === 'config'
  const shell = (
    <SidePanelShell
      open={open}
      id="drawer"
      titleId="drawer-panel-title"
      title={panelDrawer ? TITLES[panelDrawer] : 'Details'}
      subtitle={undefined}
      onClose={onClose}
      scrollKey={panelDrawer ?? ''}
      shellClassName={['drawer-shell--right', isConfigDrawer ? 'drawer-shell--config' : '']
        .filter(Boolean)
        .join(' ')}
      bodyClassName="drawer-shell-body"
      belowHeader={isConfigDrawer ? <ConfigDrawerTabs /> : undefined}
      footer={isMobileSheet ? undefined : configFooter}
    >
      {panelDrawer ? (
        isConfigDrawer ? (
          <ConfigDrawerTabPanels
            c={c}
            inputs={inputs}
            setInputs={setInputs}
            ssIncluded={ssIncluded}
            onSsIncludedChange={onSsIncludedChange}
            ssBenefitError={ssBenefitError ?? undefined}
            onDrawerClose={onConfigConfirm}
            onOpenRegister={onOpenRegister}
            onResetGuestProfile={onResetGuestProfile}
            lifePlans={lifePlans}
            onLifePlansChange={onLifePlansChange}
            currentYear={currentYear}
          />
        ) : (
          <DrawerBody
            id={panelDrawer}
            c={c}
            inputs={inputs}
            setInputs={setInputs}
            balanceMode={balanceMode}
            onBalanceModeChange={onBalanceModeChange}
            brokerageMode={brokerageMode}
            onBrokerageModeChange={onBrokerageModeChange}
            positionsImportRev={positionsImportRev}
            onImportedApplyBalances={onImportedApplyBalances}
            onPositionsImportAppliedRetirement={onPositionsImportAppliedRetirement}
            onPositionsImportAppliedBrokerage={onPositionsImportAppliedBrokerage}
          />
        )
      ) : null}
    </SidePanelShell>
  )

  return (
    <BottomSheetPortal enabled={isMobileSheet}>
      {open && (!isConfigDrawer || isMobileSheet) ? (
        <div
          className={`panel-backdrop${open ? ' panel-backdrop--open' : ''}`}
          onClick={onClose}
          aria-hidden={!open}
        />
      ) : null}
      {isConfigDrawer ? (
        <ConfigDrawerTabProvider initialTab={configInitialTab}>{shell}</ConfigDrawerTabProvider>
      ) : (
        shell
      )}
    </BottomSheetPortal>
  )
}

function DrawerBody({
  id,
  c,
  inputs,
  setInputs,
  balanceMode: _balanceMode,
  onBalanceModeChange: _onBalanceModeChange,
  brokerageMode: _brokerageMode,
  onBrokerageModeChange: _onBrokerageModeChange,
  positionsImportRev: _positionsImportRev,
  onImportedApplyBalances: _onImportedApplyBalances,
  onPositionsImportAppliedRetirement: _onPositionsImportAppliedRetirement,
  onPositionsImportAppliedBrokerage: _onPositionsImportAppliedBrokerage,
}: {
  id: DrawerName
  c: ComputedSnapshot
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  balanceMode: BalanceInputMode
  onBalanceModeChange: (m: BalanceInputMode) => void
  brokerageMode: BrokerageBalanceMode
  onBrokerageModeChange: (m: BrokerageBalanceMode) => void
  positionsImportRev: number
  onImportedApplyBalances: (b: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onPositionsImportAppliedRetirement: () => void
  onPositionsImportAppliedBrokerage: () => void
}) {
  switch (id) {
    case 'scenarios':
      return <ScenariosBody c={c} />
    case 'sstiming':
      return <SSTimingBody c={c} inputs={inputs} setInputs={setInputs} />
    case 'taxfree':
      return <TaxFreeBody c={c} />
    case 'strategy':
      return <StrategyBody c={c} filingStatus={inputs.filingStatus} />
    default:
      return null
  }
}

function ScenariosBody({ c }: { c: ComputedSnapshot }) {
  const ra = c.targetRetirementAge
  return (
    <>
      <div className="section-title">Return scenarios — retirement accounts</div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
        Six return rates applied to retirement accounts. Brokerage uses the dividend yield and return sliders from your
        dashboard (income phase).
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="scenario-table">
          <thead>
            <tr>
              <th>Rate</th>
              <th>At age {ra}</th>
              <th>Total portfolio</th>
              <th>Monthly (portfolio)</th>
              <th>Gross monthly</th>
            </tr>
          </thead>
          <tbody>
            {c.scenarios.map((row) => {
              const pillClass = row.rate >= 40 ? 'pill-danger' : row.rate >= 18 ? 'pill-warn' : 'pill-normal'
              return (
                <tr key={row.rate}>
                  <td>
                    <span className={`rate-pill ${pillClass}`}>{row.rate}%</span>
                  </td>
                  <td className="scenario-table__stack">
                    <div className="val-strong">{fmtK(row.rFV)}</div>
                    <div className="scenario-table__kv scenario-table__kv--sub">
                      <span className="scenario-table__kv-label">Brokerage</span>
                      <span className="scenario-table__kv-val scenario-table__kv-val--muted">
                        {fmtK(row.bFV)}
                      </span>
                    </div>
                  </td>
                  <td className="val-strong">{fmtK(row.tFV)}</td>
                  <td className="scenario-table__stack">
                    <div className="val-mono">{fmt(row.mPort)}</div>
                    <div className="scenario-table__kv scenario-table__kv--sub">
                      <span className="scenario-table__kv-label">+ social security</span>
                      <span className="scenario-table__kv-val">{fmt(c.ss)}</span>
                    </div>
                  </td>
                  <td className="scenario-table__stack">
                    <div className="val-strong">{fmt(row.gross)}</div>
                    <div className="scenario-table__kv scenario-table__kv--sub">
                      <span className="scenario-table__kv-label">After tax (est.)</span>
                      <span className="scenario-table__kv-val scenario-table__kv-val--accent">
                        {fmt(row.after)}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="footnote">
        Rates 6–12%: typical diversified range. 18–24%: aggressive. 40–55%: YieldMax-style distribution yield — NAV erosion risk applies; actual total return may differ materially.
      </div>
    </>
  )
}

function SSTimingBody({
  c,
  inputs,
  setInputs,
}: {
  c: ComputedSnapshot
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
}) {
  const t = c.ssTiming
  const beStr = (be: number | null) => (be ? `Age ${be}` : 'Never at this return rate')
  return (
    <div id="ss-timing-section">
      <div className="section-title">Social Security timing — breakeven analysis</div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
        SSA projected benefits × 75% (expected solvency factor): age 62 = $1,949/mo · age 67 = $2,916/mo · age 70 = $3,704/mo. Breakeven accounts for investment returns on early payments.
      </p>
      <div className="grid-3" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card" style={{ borderTop: '3px solid #A32D2D' }}>
          <div className="card-label">Draw at 62</div>
          <div className="card-value" style={{ color: 'var(--color-danger)' }}>
            $1,949/mo
          </div>
          <div className="card-sub">75% of $2,599 · Jan 2033</div>
        </div>
        <div className="card" style={{ borderTop: '3px solid #2B6CB0' }}>
          <div className="card-label">Draw at 67 (FRA)</div>
          <div className="card-value" style={{ color: '#2B6CB0' }}>
            $2,916/mo
          </div>
          <div className="card-sub">75% of $3,888 · Dec 2037</div>
        </div>
        <div className="card" style={{ borderTop: '3px solid #1D9E75' }}>
          <div className="card-label">Draw at 70 (max)</div>
          <div className="card-value" style={{ color: 'var(--color-teal-dark)' }}>
            $3,704/mo
          </div>
          <div className="card-sub">75% of $4,939 · Dec 2040</div>
        </div>
      </div>
      <div className="slider-group" style={{ maxWidth: 420, marginBottom: 'var(--space-5)' }}>
        <span className="slider-val">{inputs.ssInvestPct.toFixed(1)}%</span>
        <div className="slider-name">Portfolio return on reinvested early SS payments</div>
        <input
          type="range"
          min={0}
          max={12}
          step={0.5}
          value={inputs.ssInvestPct}
          onChange={(e) => setInputs({ ssInvestPct: Number(e.target.value) })}
        />
      </div>
      <div className="grid-4" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card">
          <div className="card-label">Breakeven: 62 vs. 67</div>
          <div className="card-value">{beStr(t.be6267)}</div>
          <div className="card-sub">Past this age, waiting to 67 pays more total</div>
        </div>
        <div className="card">
          <div className="card-label">Breakeven: 62 vs. 70</div>
          <div className="card-value">{beStr(t.be6270)}</div>
          <div className="card-sub">Past this age, waiting to 70 pays more total</div>
        </div>
        <div className="card">
          <div className="card-label">Breakeven: 67 vs. 70</div>
          <div className="card-value">{beStr(t.be6770)}</div>
          <div className="card-sub">Past this age, waiting to 70 beats drawing at 67</div>
        </div>
        <div className="card gold">
          <div className="card-label">Overseas COL</div>
          <div className="card-value" style={{ fontSize: '1rem', lineHeight: 1.4 }}>
            Draw at 62
          </div>
          <div className="card-sub">Low cost of living means you don&apos;t need max SS — take it early and invest the difference</div>
        </div>
      </div>
      <div style={{ overflowX: 'auto', marginBottom: 'var(--space-4)' }}>
        <table className="scenario-table">
          <thead>
            <tr>
              <th>Age</th>
              <th>Cumul: draw at 62</th>
              <th>Cumul: draw at 67</th>
              <th>Cumul: draw at 70</th>
              <th>Best option</th>
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row) => {
              const bestColor = row.best === '62' ? '#A32D2D' : row.best === '67' ? '#2B6CB0' : '#0F6E56'
              return (
                <tr key={row.age}>
                  <td className="val-mono">Age {row.age}</td>
                  <td className="val-mono" style={{ color: '#A32D2D' }}>
                    {fmt(Math.round(row.c62))}
                  </td>
                  <td className="val-mono" style={{ color: '#2B6CB0' }}>
                    {row.age < 67 ? '—' : fmt(Math.round(row.c67))}
                  </td>
                  <td className="val-mono" style={{ color: '#0F6E56' }}>
                    {row.age < 70 ? '—' : fmt(Math.round(row.c70))}
                  </td>
                  <td>
                    <span className="rate-pill pill-normal" style={{ color: bestColor, fontSize: 11 }}>
                      Draw at {row.best}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="footnote">
        Cumulative totals include hypothetical investment returns on payments received. Breakeven varies with health, longevity, and income needs. If relocating to Italy with low living costs, drawing at 62 is often optimal. The earnings test applies if you claim before FRA and earn over ~$22,320/yr.
      </div>
    </div>
  )
}

function TaxFreeBody({ c }: { c: ComputedSnapshot }) {
  const { locale, taxConfig } = useUserLocale()
  const pension = pensionConfigForLocale(locale)
  const taxFree = taxFreeWithdrawalLabels(taxConfig)
  const showRoth = localeSupportsWithdrawalBucket(locale, 'roth')
  const showHsa = localeSupportsWithdrawalBucket(locale, 'hsa')
  const showPretax = localeSupportsWithdrawalBucket(locale, 'pretax')
  const pretaxLabel = accountLabelForWithdrawalBucket(taxConfig, 'pretax') ?? 'Pre-tax retirement'
  const usSsBadge = c.ssZone === 'free' ? 'badge-green' : c.ssZone === 'partial' ? 'badge-warn' : 'badge-danger'
  const taxFreeMon = (showRoth ? c.rothMon : 0) + (showHsa ? c.hsaMon : 0)

  return (
    <>
      <div className="section-title">Tax-advantaged withdrawals</div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
        {taxConfig.withdrawalOrderNote} {taxConfig.taxFreeNote}
      </p>
      <div>
        {showRoth && c.rothMon > 0 ? (
          <StackItem
            title={`${taxFree.primary} withdrawals`}
            badge={<span className="badge badge-green">tax-advantaged</span>}
            amount={fmtMon(c.rothMon)}
            note={
              taxConfig.accountTypes.find((a) => a.taxTreatment === 'roth' || a.taxTreatment === 'taxfree')
                ?.withdrawalNote ?? taxConfig.taxFreeNote
            }
            accentAmount
          />
        ) : null}
        {showHsa && c.hsaMon > 0 ? (
          <StackItem
            title={`${taxFree.secondary ?? 'HSA'} withdrawals`}
            badge={<span className="badge badge-green">qualified expenses</span>}
            amount={fmtMon(c.hsaMon)}
            note="Use for qualified medical expenses where rules allow tax-free treatment."
            accentAmount
          />
        ) : null}
        <StackItem
          title={taxConfig.pensionLabel}
          badge={
            locale === 'us' ? (
              <span className={`badge ${usSsBadge}`}>{c.ssLabel}</span>
            ) : (
              <span className="badge badge-warn">taxable income</span>
            )
          }
          amount={fmtMon(c.ss)}
          note={taxConfig.pensionTaxNote}
        >
          {locale === 'us' ? (
            <>
              <div className="prog-bar">
                <div className="prog-fill" style={{ width: `${c.barPct}%`, background: c.barColor }} />
              </div>
              <div className="prog-labels">
                <span>{fmt(0)}</span>
                <span>{fmt(25_000)} — 0% line</span>
                <span>{fmt(34_000)} — 50% line</span>
              </div>
            </>
          ) : null}
        </StackItem>
        {showPretax && locale === 'us' ? (
          <StackItem
            title={`${pretaxLabel} headroom`}
            badge={<span className="badge badge-warn">limited</span>}
            amount={`${fmt(c.headroom0)}/yr`}
            note={`Room before ${taxConfig.pensionLabel} provisional income thresholds are exceeded.`}
          />
        ) : null}
      </div>
      <hr className="divider" />
      <div className="grid-3">
        {taxFreeMon > 0 ? (
          <div className="card accent">
            <div className="card-label">
              {taxFree.secondary ? `${taxFree.primary} + ${taxFree.secondary}` : taxFree.primary} monthly (est.)
            </div>
            <div className="card-value">{fmtMon(taxFreeMon)}</div>
            <div className="card-sub">tax-advantaged withdrawals at {c.targetRetirementAge}</div>
          </div>
        ) : null}
        <div className="card accent">
          <div className="card-label">{pension.stepTitle} monthly</div>
          <div className="card-value">{fmtMon(c.totalSS)}</div>
          <div className="card-sub">{locale === 'us' ? c.ssLabel : taxConfig.pensionTaxNote}</div>
        </div>
        {showPretax && locale === 'us' ? (
          <div className="card">
            <div className="card-label">{pretaxLabel} headroom/yr</div>
            <div className="card-value">{fmt(c.headroom0)}/yr</div>
            <div className="card-sub">before pension taxation increases</div>
          </div>
        ) : null}
      </div>
      <div className="footnote">{taxConfig.taxDisclaimer}</div>
    </>
  )
}

function StackItem({
  title,
  badge,
  amount,
  note,
  children,
  accentAmount = false,
}: {
  title: string
  badge: ReactNode
  amount: string
  note: ReactNode
  children?: ReactNode
  accentAmount?: boolean
}) {
  return (
    <div className="stack-item">
      <div className="stack-item-top">
        <span className="stack-item-title">
          {title}
          {badge}
        </span>
        <span
          className="stack-item-amount"
          style={{ color: accentAmount ? 'var(--accent-text)' : undefined }}
        >
          {amount}
        </span>
      </div>
      <p className="stack-item-note">{note}</p>
      {children}
    </div>
  )
}

function StrategyBody({ c, filingStatus }: { c: ComputedSnapshot; filingStatus: CalculatorInputs['filingStatus'] }) {
  const { locale, taxConfig } = useUserLocale()

  if (!c.hasPortfolioBalances) {
    return (
      <>
        <div className="section-title">Optimal withdrawal strategy</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Add account balances or import positions to see a withdrawal sequence based on your portfolio, tax buckets, and
          sliders.
        </p>
      </>
    )
  }

  const s = c.strategy
  const pretaxLabel = accountLabelForWithdrawalBucket(taxConfig, 'pretax') ?? 'Pre-tax'
  const rothLabel = accountLabelForWithdrawalBucket(taxConfig, 'roth') ?? 'Tax-advantaged'
  const brokerageLabel = accountLabelForWithdrawalBucket(taxConfig, 'brokerage') ?? 'Taxable'
  const showRoth = localeSupportsWithdrawalBucket(locale, 'roth')
  const showHsa = localeSupportsWithdrawalBucket(locale, 'hsa')
  const steps = buildWithdrawalStrategySteps(locale, taxConfig, c, filingStatus)

  const fmtStep = (n: number, title: string, tag: string, tagColor: string, body: string) => (
    <div key={n} style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
      <div
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--text)',
          color: 'var(--bg)',
          fontFamily: 'var(--mono)',
          fontSize: 12,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {n}
      </div>
      <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 'var(--space-4) var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 100,
              background: `${tagColor}20`,
              color: tagColor,
              border: `1px solid ${tagColor}40`,
            }}
          >
            {tag}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{body}</p>
      </div>
    </div>
  )

  return (
    <>
      <div className="section-title">Optimal withdrawal strategy</div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
        {taxConfig.withdrawalOrderNote} Figures use your current balances and sliders.
      </p>
      <div
        style={{
          background: 'var(--surface2)',
          borderRadius: 10,
          padding: 'var(--space-4) var(--space-5)',
          marginBottom: 'var(--space-5)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        <Cell k={`${pretaxLabel} withdrawal/yr`} v={fmt(s.tradWdAnn)} color="var(--warn)" />
        {showRoth ? <Cell k={`${rothLabel} withdrawal/yr`} v={fmt(s.rothWdAnn)} color="var(--accent-text)" /> : null}
        {showHsa ? (
          <Cell
            k={`${taxFreeWithdrawalLabels(taxConfig).secondary ?? 'HSA'} withdrawal/yr`}
            v={fmt(s.hsaWdAnn)}
            color="var(--gold)"
          />
        ) : null}
        <Cell k={`${brokerageLabel} withdrawal/yr`} v={fmt(s.brkWdAnn)} />
        {locale === 'us' && s.rothConvRoom > 0 ? (
          <Cell
            k="Roth conversion room"
            v={s.rothConvRoom > 0 ? `${fmt(s.rothConvRoom)}/yr` : 'At bracket cap'}
            color="var(--accent-text)"
          />
        ) : null}
        <Cell k="Effective tax rate" v={`${(s.taxDetail.effectiveRate * 100).toFixed(1)}%`} />
      </div>
      {steps.map((step, i) => fmtStep(i + 1, step.title, step.tag, step.tagColor, step.body))}
      <div className="footnote">{withdrawalExplainerDisclaimer(taxConfig)}</div>
    </>
  )
}

function Cell({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--body)', fontSize: 9, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>{k}</div>
      <div style={{ fontFamily: 'var(--heading)', fontSize: '1rem', fontWeight: 500, color: color ?? 'var(--text)' }}>{v}</div>
    </div>
  )
}

