import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Button } from '@heroui/react'
import { useAuth } from '../context/AuthContext'
import type { ComputedSnapshot, CalculatorInputs, CalculatorUi, DrawerName } from '../lib/computeResults'
import type { BalanceInputMode } from '../lib/retirementBalanceMode'
import type { BrokerageBalanceMode } from '../lib/brokerageBalanceMode'
import { fmt, fmtK, fmtMon } from '../utils/format'
import { ConfigDrawerBody, type ConfigDrawerTab } from './ConfigDrawerBody'
import { InlineSliderRow } from './InlineSliderRow'
import { SidePanelShell } from './SidePanelShell'
import './PanelChrome.scss'

const TITLES: Record<DrawerName, string> = {
  scenarios: 'Return scenarios',
  sstiming: 'SS timing',
  taxfree: 'Tax-free withdrawals',
  strategy: 'Withdrawal strategy',
  italy: 'Italy comparison',
  config: 'Make your plans',
}

type Props = {
  drawer: DrawerName | null
  onClose: () => void
  c: ComputedSnapshot
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  ui: CalculatorUi
  activePreset: string | null
  setActivePreset: (id: string | null) => void
  balanceMode: BalanceInputMode
  onBalanceModeChange: (m: BalanceInputMode) => void
  brokerageMode: BrokerageBalanceMode
  onBrokerageModeChange: (m: BrokerageBalanceMode) => void
  fidelityImportRev: number
  onFidelityApplyBalances: (b: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onFidelityImportAppliedRetirement: () => void
  onFidelityImportAppliedBrokerage: () => void
  configInitialTab?: ConfigDrawerTab
}

export function DrawerPanel({
  drawer,
  onClose,
  c,
  inputs,
  setInputs,
  ui,
  activePreset,
  setActivePreset,
  balanceMode,
  onBalanceModeChange,
  brokerageMode,
  onBrokerageModeChange,
  fidelityImportRev,
  onFidelityApplyBalances,
  onFidelityImportAppliedRetirement,
  onFidelityImportAppliedBrokerage,
  configInitialTab,
}: Props) {
  const open = drawer != null
  const { user, signOut } = useAuth()

  const configFooter =
    drawer === 'config' && user?.email ? (
      <div className="drawer-config-footer">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="drawer-config-footer__signout"
          onPress={() => void signOut()}
        >
          Sign out
        </Button>
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

  return (
    <>
      <div
        className={`panel-backdrop${open ? ' panel-backdrop--open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <SidePanelShell
        open={open}
        id="drawer"
        titleId="drawer-panel-title"
        title={drawer ? TITLES[drawer] : 'Details'}
        onClose={onClose}
        scrollKey={drawer ?? ''}
        shellClassName={['drawer-shell--right', drawer === 'config' ? 'drawer-shell--config' : '']
          .filter(Boolean)
          .join(' ')}
        bodyClassName="drawer-shell-body"
        footer={configFooter}
      >
        {drawer ? (
          <DrawerBody
            id={drawer}
            c={c}
            inputs={inputs}
            setInputs={setInputs}
            ui={ui}
            activePreset={activePreset}
            setActivePreset={setActivePreset}
            balanceMode={balanceMode}
            onBalanceModeChange={onBalanceModeChange}
            brokerageMode={brokerageMode}
            onBrokerageModeChange={onBrokerageModeChange}
            fidelityImportRev={fidelityImportRev}
            onFidelityApplyBalances={onFidelityApplyBalances}
            onFidelityImportAppliedRetirement={onFidelityImportAppliedRetirement}
            onFidelityImportAppliedBrokerage={onFidelityImportAppliedBrokerage}
            configInitialTab={configInitialTab}
          />
        ) : null}
      </SidePanelShell>
    </>
  )
}

function DrawerBody({
  id,
  c,
  inputs,
  setInputs,
  ui,
  activePreset,
  setActivePreset,
  balanceMode: _balanceMode,
  onBalanceModeChange: _onBalanceModeChange,
  brokerageMode: _brokerageMode,
  onBrokerageModeChange: _onBrokerageModeChange,
  fidelityImportRev: _fidelityImportRev,
  onFidelityApplyBalances: _onFidelityApplyBalances,
  onFidelityImportAppliedRetirement: _onFidelityImportAppliedRetirement,
  onFidelityImportAppliedBrokerage: _onFidelityImportAppliedBrokerage,
  configInitialTab,
}: {
  id: DrawerName
  c: ComputedSnapshot
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  ui: CalculatorUi
  activePreset: string | null
  setActivePreset: (id: string | null) => void
  balanceMode: BalanceInputMode
  onBalanceModeChange: (m: BalanceInputMode) => void
  brokerageMode: BrokerageBalanceMode
  onBrokerageModeChange: (m: BrokerageBalanceMode) => void
  fidelityImportRev: number
  onFidelityApplyBalances: (b: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onFidelityImportAppliedRetirement: () => void
  onFidelityImportAppliedBrokerage: () => void
  configInitialTab?: ConfigDrawerTab
}) {
  switch (id) {
    case 'config':
      return (
        <ConfigDrawerBody
          c={c}
          inputs={inputs}
          setInputs={setInputs}
          ui={ui}
          activePreset={activePreset}
          setActivePreset={setActivePreset}
          initialTab={configInitialTab}
        />
      )
    case 'scenarios':
      return <ScenariosBody c={c} />
    case 'sstiming':
      return <SSTimingBody c={c} inputs={inputs} setInputs={setInputs} />
    case 'taxfree':
      return <TaxFreeBody c={c} />
    case 'strategy':
      return <StrategyBody c={c} />
    case 'italy':
      return <ItalyBody c={c} inputs={inputs} setInputs={setInputs} />
    default:
      return null
  }
}

function ScenariosBody({ c }: { c: ComputedSnapshot }) {
  const ra = c.targetRetirementAge
  return (
    <>
      <div className="section-title">Return scenarios — retirement accounts</div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
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
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        SSA projected benefits × 75% (expected solvency factor): age 62 = $1,949/mo · age 67 = $2,916/mo · age 70 = $3,704/mo. Breakeven accounts for investment returns on early payments.
      </p>
      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
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
      <div className="slider-group" style={{ maxWidth: 420, marginBottom: '1.5rem' }}>
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
      <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
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
          <div className="card-label">Italy consideration</div>
          <div className="card-value" style={{ fontSize: '1rem', lineHeight: 1.4 }}>
            Draw at 62
          </div>
          <div className="card-sub">Low cost of living means you don&apos;t need max SS — take it early and invest the difference</div>
        </div>
      </div>
      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
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
  const badge = c.ssZone === 'free' ? 'badge-green' : c.ssZone === 'partial' ? 'badge-warn' : 'badge-danger'
  return (
    <>
      <div className="section-title">Tax-free withdrawal strategy</div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        Pull from Roth and HSA first. SS taxation depends on combined income. Traditional 401k last — it can push SS into taxable territory.
      </p>
      <div>
        <StackItem
          title="Roth IRA withdrawals"
          badge={<span className="badge badge-green">always tax-free</span>}
          amount={fmtMon(c.rothMon)}
          note="4% on ~16% of projected retirement total. No income inclusion, no RMDs until 73, never affects SS taxation."
        />
        <StackItem
          title="HSA withdrawals"
          badge={<span className="badge badge-green">tax-free for medical</span>}
          amount={fmtMon(c.hsaMon)}
          note="4% on ~10% of projected retirement total. Tax-free for qualified medical expenses — Medicare premiums, dental, vision, LTC insurance."
        />
        <StackItem
          title="Social Security"
          badge={<span className={`badge ${badge}`}>{c.ssLabel}</span>}
          amount={fmtMon(c.ss)}
          note={
            <>
              Combined income test: ½ SS ({fmt(c.halfSS / 12)}/mo) + other income ({fmt(c.combinedInc - c.halfSS)}/yr) = {fmt(c.combinedInc)}/yr vs. $25k/$34k thresholds.
            </>
          }
        >
          <div className="prog-bar">
            <div className="prog-fill" style={{ width: `${c.barPct}%`, background: c.barColor }} />
          </div>
          <div className="prog-labels">
            <span>$0</span>
            <span>$25k — 0% line</span>
            <span>$34k — 50% line</span>
          </div>
        </StackItem>
        <StackItem
          title="Traditional 401k headroom"
          badge={<span className="badge badge-warn">limited</span>}
          amount={`${fmt(c.headroom0)}/yr`}
          note="Amount you can withdraw from traditional accounts before pushing combined income past $25k and triggering SS taxation."
        />
      </div>
      <hr className="divider" />
      <div className="grid-3">
        <div className="card accent">
          <div className="card-label">Roth + HSA monthly (4% wd, est.)</div>
          <div className="card-value">{fmtMon(c.rothMon + c.hsaMon)}</div>
          <div className="card-sub">~26% of ret. accts at {c.targetRetirementAge}</div>
        </div>
        <div className="card accent">
          <div className="card-label">SS monthly</div>
          <div className="card-value">{fmtMon(c.totalSS)}</div>
          <div className="card-sub">{c.ssLabel}</div>
        </div>
        <div className="card">
          <div className="card-label">Trad. 401k headroom/yr</div>
          <div className="card-value">{fmt(c.headroom0)}/yr</div>
          <div className="card-sub">before SS taxation triggers</div>
        </div>
      </div>
      <div className="footnote">
        Combined income = AGI + nontaxable interest + ½ SS. Standard deduction ($14,600 single / $29,200 married) reduces taxable income but not the SS combined income test. HSA withdrawals are tax-free only for qualified medical expenses — includes Medicare premiums, dental, vision, LTC insurance.
      </div>
    </>
  )
}

function StackItem({
  title,
  badge,
  amount,
  note,
  children,
}: {
  title: string
  badge: ReactNode
  amount: string
  note: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="stack-item">
      <div className="stack-item-top">
        <span className="stack-item-title">
          {title}
          {badge}
        </span>
        <span className="stack-item-amount" style={{ color: title.includes('Roth') || title.includes('HSA') ? 'var(--accent-text)' : undefined }}>
          {amount}
        </span>
      </div>
      <p className="stack-item-note">{note}</p>
      {children}
    </div>
  )
}

function StrategyBody({ c }: { c: ComputedSnapshot }) {
  if (!c.hasPortfolioBalances) {
    return (
      <>
        <div className="section-title">Optimal withdrawal strategy</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Add account balances or import a positions CSV to see a withdrawal sequence based on your portfolio, tax buckets,
          and sliders.
        </p>
      </>
    )
  }

  const s = c.strategy
  const fmtStep = (n: number, title: string, tag: string, tagColor: string, body: string) => (
    <div key={n} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
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
      <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              padding: '2px 8px',
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

  const stdDed = 29200
  const bracket12top = 89075
  const room12 = Math.max(0, bracket12top - Math.max(0, s.tradWdAnn - stdDed))

  return (
    <>
      <div className="section-title">Optimal withdrawal strategy</div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        The sequence you pull from your accounts matters almost as much as the amounts. This strategy minimizes lifetime taxes, preserves tax-free growth as long as possible, and keeps SS taxation low. Figures are based on your current balances and sliders above.
      </p>
      <div
        style={{
          background: 'var(--surface2)',
          borderRadius: 10,
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
        }}
      >
        <Cell k="Trad. 401k withdrawal/yr" v={fmt(s.tradWdAnn)} color="var(--warn)" />
        <Cell k="Roth withdrawal/yr" v={fmt(s.rothWdAnn)} color="var(--accent-text)" />
        <Cell k="HSA withdrawal/yr" v={fmt(s.hsaWdAnn)} color="var(--gold)" />
        <Cell k="Brokerage withdrawal/yr" v={fmt(s.brkWdAnn)} />
        <Cell
          k="Roth conversion room"
          v={s.rothConvRoom > 0 ? `${fmt(s.rothConvRoom)}/yr` : 'At bracket cap'}
          color="var(--accent-text)"
        />
        <Cell k="Effective tax rate" v={`${(s.taxDetail.effectiveRate * 100).toFixed(1)}%`} />
      </div>
      {fmtStep(
        1,
        'Cover fixed expenses with SS + Brokerage',
        'Year 1 priority',
        '#0F6E56',
        `Your combined SS (${fmtMon(s.totalSS)}) plus brokerage withdrawals (${fmtMon(s.brkWdAnn / 12)}) covers the base. Use brokerage first for discretionary spending — long-term capital gains are taxed at 15% (lower than ordinary income), and drawing from it first lets your retirement accounts continue compounding.`,
      )}
      {fmtStep(
        2,
        'Draw HSA for all medical expenses',
        'Always first for medical',
        '#EF9F27',
        `Before paying any medical bill out of pocket — premiums, dental, vision, prescriptions, long-term care — use the HSA. At ${fmtMon(s.hsaWdAnn / 12)}/mo projected, this covers ongoing healthcare costs completely tax-free. Never use taxable income when HSA dollars are available for qualified expenses.`,
      )}
      {fmtStep(
        3,
        'Pull Roth IRA for large one-time needs',
        'Tax-free flexibility',
        '#0F6E56',
        `Roth withdrawals (${fmtMon(s.rothWdAnn / 12)}/mo) are always tax-free and don't affect SS provisional income. Use Roth for big-ticket items — renovations, travel, car purchases — rather than taking a larger traditional withdrawal that pushes you into a higher bracket.`,
      )}
      {fmtStep(
        4,
        'Traditional 401k: stay inside the 12% bracket',
        'Tax-managed',
        '#BA7517',
        `Your traditional withdrawals (${fmtMon(s.tradWdAnn / 12)}/mo) are ordinary income. Filing jointly, the 12% bracket tops out at ~$89,075 of taxable income. After your standard deduction of $29,200, you have ${fmt(room12)} of room before hitting the 22% bracket. Try not to exceed that with Roth conversions on top.`,
      )}
      {fmtStep(
        5,
        s.rothConvRoom > 500 ? `Convert up to ${fmt(s.rothConvRoom)}/yr from Traditional → Roth` : 'Roth conversion: limited room at current withdrawal rate',
        `Years ${c.targetRetirementAge}–72`,
        '#2B6CB0',
        `The window between age ${c.targetRetirementAge} and your first RMD at 73 is the prime Roth conversion opportunity. You have ~${fmt(s.rothConvRoom)}/yr of 12% bracket headroom after accounting for current traditional withdrawals. Converting this amount each year moves money from taxable-at-withdrawal to permanently tax-free, reducing future RMDs. This is especially powerful since your traditional 401k ($${s.tradBalK}k) will force RMDs in 11 years.`,
      )}
      {fmtStep(
        6,
        'Delay spouse SS if possible — claim at your FRA (67)',
        'SS optimization',
        '#A32D2D',
        `Spouse draws 50% of your benefit. Your FRA benefit is $3,888 — so spouse gets $1,944/mo at their FRA. If spouse claims at 62 it drops to $1,299. The breakeven for waiting vs. claiming early is roughly age 78. Since your combined income from portfolio + your SS is already strong, the spouse can afford to delay. Recommended: you claim at 62, spouse waits to 67. Combined: ${fmt(s.combinedSS67)}/mo.`,
      )}
      {fmtStep(
        7,
        'After 70: reassess traditional 401k drawdown',
        'RMD planning',
        '#BA7517',
        `At 73, RMDs kick in on your traditional 401k. Based on your current balances growing at ${s.retRatePct}%, the traditional bucket (~${fmtK(s.tradFvK)}) will generate a required minimum you cannot avoid. Start drawing down traditional accounts more aggressively between ${c.targetRetirementAge}–72 — ideally to the point where RMDs stay within the 12% bracket. Roth conversions are the cleanest tool for this.`,
      )}
      <div className="footnote">
        This strategy assumes you are married filing jointly. Bracket amounts adjust annually for inflation. The Roth conversion window (ages{' '}
        {c.targetRetirementAge}
        –72) is the most powerful planning opportunity — traditional 401k balances force RMDs at 73 that can push you into higher brackets. Filling lower brackets with conversions now avoids that. Consult a fee-only fiduciary advisor before executing. This is a planning framework, not tax advice.
      </div>
    </>
  )
}

function Cell({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--body)', fontSize: 9, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
      <div style={{ fontFamily: 'var(--heading)', fontSize: '1rem', fontWeight: 500, color: color ?? 'var(--text)' }}>{v}</div>
    </div>
  )
}

function ItalyBody({
  c,
  inputs,
  setInputs,
}: {
  c: ComputedSnapshot
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
}) {
  const sur = c.itSurplus
  return (
    <>
      <div className="section-title">
        <span className="italy-flag" aria-hidden="true">
          <span style={{ background: '#009246' }} />
          <span style={{ background: '#fff', border: '1px solid #ddd' }} />
          <span style={{ background: '#CE2B37' }} />
        </span>
        Italy retirement comparison
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        Italy&apos;s Art. 24-bis: 7% flat tax on foreign income for new residents, valid 10 years. The US taxes citizens on worldwide income regardless of residency — the Foreign Tax Credit offsets double taxation. The real Italy advantage is lower cost of living.
      </p>
      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, paddingTop: 4 }}>
          $2,000–$2,800: smaller city (Bari, Lecce, Abruzzo)
          <br />
          $2,800–$3,800: mid-size city (Bologna, Florence outskirts)
          <br />
          $4,000+: Milan, Rome, coastal hotspots
        </div>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <InlineSliderRow
          name="Assumed monthly living cost (USD)"
          valueLabel={fmtMon(inputs.italyCost)}
          min={0}
          max={8000}
          step={100}
          value={inputs.italyCost}
          onChange={(v) => setInputs({ italyCost: v })}
          tickLeft="$0"
          tickMid="$4k"
          tickRight="$8k"
          borderBottomNone
        />
      </div>
      <div
        style={{
          background: 'var(--text)',
          color: 'var(--bg)',
          borderRadius: 16,
          padding: '1.5rem 2rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', fontFamily: 'var(--body)', marginBottom: 4 }}>Monthly income (gross)</div>
          <div style={{ fontFamily: 'var(--heading)', fontSize: 'clamp(1.5rem,3vw,2.2rem)', color: 'var(--color-teal-light)' }}>{fmtMon(c.grossMon)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', fontFamily: 'var(--body)', marginBottom: 4 }}>Italy 7% flat tax /mo</div>
          <div style={{ fontFamily: 'var(--heading)', fontSize: 'clamp(1.2rem,2.5vw,1.8rem)', color: 'var(--color-amber)' }}>{fmtMon(c.itTax / 12)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)', fontFamily: 'var(--body)', marginBottom: 4 }}>After-tax monthly</div>
          <div style={{ fontFamily: 'var(--heading)', fontSize: 'clamp(1.5rem,3vw,2.2rem)', color: 'var(--color-teal-light)' }}>{fmtMon(c.itAfter)}</div>
        </div>
      </div>
      <div className="grid-3">
        <div className="card">
          <div className="card-label">Est. living cost</div>
          <div className="card-value">{fmtMon(inputs.italyCost)}</div>
          <div className="card-sub">monthly (USD)</div>
        </div>
        <div className={`card ${sur >= 0 ? 'accent' : 'warn'}`}>
          <div className="card-label">Monthly surplus / shortfall</div>
          <div className="card-value" style={{ color: sur >= 0 ? 'var(--accent-text)' : 'var(--warn)' }}>
            {(sur >= 0 ? '+' : '') + fmt(sur)}/mo
          </div>
          <div className="card-sub">{sur >= 0 ? 'comfortable margin above living costs' : 'shortfall — consider higher savings or selling home'}</div>
        </div>
        <div className="card">
          <div className="card-label">US federal tax (same income)</div>
          <div className="card-value">{fmtMon(c.usTax / 12)}</div>
          <div className="card-sub">for comparison</div>
        </div>
      </div>
      <div className="footnote">
        Italy 7% flat tax under Art. 24-bis applies to qualifying new residents for up to 10 years on foreign-sourced income. US citizens still owe US federal tax — the Foreign Tax Credit (Form 1116) typically prevents true double taxation; you pay the higher rate, not both. After 10 years the flat tax expires and Italy taxes at progressive rates (23–43%). Consult a cross-border tax advisor before relocating.
      </div>
    </>
  )
}
