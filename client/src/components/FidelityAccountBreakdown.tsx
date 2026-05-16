import { useMemo, useRef, useState } from 'react'
import { formatFidelityDescription } from '../lib/fidelityDisplay'
import { groupPositionsByAccount, type FidelityPositionRow } from '../lib/fidelityCsv'
import { truncateForHoldingsTable } from '../lib/fidelityHoldingDisplay'
import { fmt } from '../utils/format'
import { FidelityValueHoverPortal } from './FidelityValueHoverPortal'
import { Tooltip } from './Tooltip'

type Props = {
  rows: FidelityPositionRow[]
}

function placementForHover(rect: DOMRect): 'above' | 'below' {
  const spaceBelow = window.innerHeight - rect.bottom
  return spaceBelow >= 100 ? 'below' : 'above'
}

function BreakdownValueCell({ r }: { r: FidelityPositionRow }) {
  const [pop, setPop] = useState<{ rect: DOMRect; placement: 'above' | 'below' } | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lock = useRef(false)

  const clearT = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
  }

  const scheduleClose = () => {
    clearT()
    leaveTimer.current = setTimeout(() => {
      if (!lock.current) setPop(null)
    }, 140)
  }

  return (
    <>
      <span
        className="fidelity-agg-value-trigger"
        onMouseEnter={(e) => {
          clearT()
          lock.current = false
          const rect = e.currentTarget.getBoundingClientRect()
          setPop({ rect, placement: placementForHover(rect) })
        }}
        onMouseLeave={() => scheduleClose()}
      >
        {fmt(r.currentValue)}
      </span>
      <FidelityValueHoverPortal
        open={Boolean(pop)}
        rect={pop?.rect ?? null}
        placement={pop?.placement ?? 'below'}
        source={r}
        onMouseEnterPopout={() => {
          lock.current = true
          clearT()
        }}
        onMouseLeavePopout={() => {
          lock.current = false
          scheduleClose()
        }}
      />
    </>
  )
}

export function FidelityAccountPositionsTable({
  rows,
  showScenarioColumn = false,
}: {
  rows: FidelityPositionRow[]
  /** Scenario editing is post-import only (dashboard aggregated table). */
  showScenarioColumn?: boolean
}) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.currentValue - a.currentValue),
    [rows],
  )
  if (!sorted.length) return null

  return (
    <div className="fidelity-acct-positions">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th className="fidelity-th-upper">Description</th>
            <th style={{ textAlign: 'right' }}>Value</th>
            <th className="fidelity-th-upper" style={{ textAlign: 'right' }}>
              Cost basis
            </th>
            {showScenarioColumn ? (
              <th className="fidelity-th-upper fidelity-agg-scenario-th">Scenario</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const rowKey = `${r.accountName}-${r.symbol}-${i}`
            const fullDesc = formatFidelityDescription(r.description)
            const shortDesc = truncateForHoldingsTable(fullDesc)
            const showTip = fullDesc.length > shortDesc.length
            return (
              <tr key={rowKey}>
                <td className="sym">{r.symbol}</td>
                <td className="fidelity-desc-cell fidelity-desc-cell--trunc">
                  {showTip ? (
                    <Tooltip content={fullDesc} placement="top">
                      <span>{shortDesc}</span>
                    </Tooltip>
                  ) : (
                    <span title={fullDesc}>{shortDesc}</span>
                  )}
                </td>
                <td className="val" style={{ textAlign: 'right' }}>
                  <BreakdownValueCell r={r} />
                </td>
                <td className="val" style={{ textAlign: 'right' }}>
                  {r.costBasis != null ? fmt(r.costBasis) : '—'}
                </td>
                {showScenarioColumn ? (
                  <td className="val fidelity-agg-scenario-cell" style={{ color: 'var(--text-faint)' }}>
                    —
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Collapsible per-account position tables (Fidelity export rows). */
export function FidelityAccountBreakdown({ rows }: Props) {
  const accountGroups = useMemo(() => (rows.length ? groupPositionsByAccount(rows) : []), [rows])
  if (!accountGroups.length) return null

  return (
    <>
      {accountGroups.map((g) => (
        <details key={g.accountName} className="fidelity-acct-details">
          <summary>
            <div className="fidelity-acct-summary-main">
              <span className="fidelity-acct-fido-name">{g.accountName}</span>
              <span className={`fidelity-acct-mapped${g.bucket === 'unknown' ? ' unmapped' : ''}`}>
                → {g.calculatorLabel}
                {g.bucket === 'unknown' ? ' (not applied to totals)' : ''}
              </span>
            </div>
            <span className="fidelity-acct-summary-total">{fmt(g.total)}</span>
          </summary>
          <FidelityAccountPositionsTable rows={g.rows} />
        </details>
      ))}
    </>
  )
}
