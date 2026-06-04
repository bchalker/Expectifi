import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Button, ButtonGroup } from '@heroui/react'
import { positionsForBrokerage, type ImportedPositionRow } from '../lib/positionsCsv'
import { flattenBatches, latestBatchCustodian, loadStoredPositionsImport } from '../lib/positionsImportStorage'
import type { BrokerageBalanceMode } from '../lib/brokerageBalanceMode'
import type { CalculatorInputs } from '../lib/computeResults'
import { computeBucketTrendDisplay } from '../lib/bucketHoldingTrend'
import { PortfolioBucketAccountRow } from './PortfolioBucketAccountRow'
import { BucketHoldingsSubrows } from './BucketHoldingsSubrows'
import { PositionsCsvImport } from './PositionsCsvImport'
import { fmt, fmtInput, parseNum } from '../utils/format'
import { currencySymbol } from '../lib/displayCurrency'

type Props = {
  brkBal: number
  onBrkBal?: (n: number) => void
  brkRate: number
  onBrkRate?: (r: number) => void
  brokerageMode: BrokerageBalanceMode
  onBrokerageModeChange?: (m: BrokerageBalanceMode) => void
  positionsImportRev: number
  onImportedApplyBalances?: (partial: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onPositionsImportApplied?: () => void
  /** When true, show balance, import breakdown, and return % only — no editors or import UI. */
  readOnly?: boolean
  /** Configure drawer: toggles + import + manual balance fields + return slider; hide balance output rows for Fidelity CSV mode. */
  configureInputsOnly?: boolean
}

export function BrokerageCard({
  brkBal,
  onBrkBal,
  brkRate,
  onBrkRate,
  brokerageMode,
  onBrokerageModeChange,
  positionsImportRev,
  onImportedApplyBalances,
  onPositionsImportApplied,
  readOnly = false,
  configureInputsOnly = false,
}: Props) {
  const importedPositionRows = useMemo(() => {
    void positionsImportRev
    const imp = loadStoredPositionsImport()
    if (!imp?.batches?.length) return [] as ImportedPositionRow[]
    return flattenBatches(imp.batches)
  }, [positionsImportRev])

  const brokeragePositions = useMemo(() => positionsForBrokerage(importedPositionRows), [importedPositionRows])
  const hasImportedBrokerage = brokeragePositions.length > 0
  const brokerageTrend = computeBucketTrendDisplay(brokeragePositions)

  const importCustodian = useMemo(() => {
    void positionsImportRev
    const imp = loadStoredPositionsImport()
    if (!imp?.batches?.length) return 'fidelity' as const
    return latestBatchCustodian(imp.batches)
  }, [positionsImportRev])

  const brokerageReturnPanel: ReactNode = readOnly ? (
    <div style={{ fontFamily: 'var(--body)', fontSize: 13, color: 'var(--text-muted)' }}>
      Taxable annual return: <strong style={{ color: 'var(--text)' }}>{(brkRate * 100).toFixed(1)}%</strong>
    </div>
  ) : (
    <div className="slider-group" style={{ marginTop: 0, marginBottom: 0 }}>
      <span className="slider-val">{(brkRate * 100).toFixed(1)}%</span>
      <div className="slider-name">Brokerage annual return</div>
      <input
        type="range"
        min={3}
        max={55}
        step={0.5}
        value={brkRate * 100}
        onChange={(e) => onBrkRate?.(Number(e.target.value) / 100)}
      />
    </div>
  )

  function renderBrokerageBalanceSection() {
    if (readOnly) {
      if (brokerageMode === 'manual') {
        return (
          <div className="edit-row edit-row--no-divider" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className="edit-row-label">Taxable brokerage</span>
              <span style={{ fontFamily: 'var(--heading)', fontSize: 'var(--text-base)', fontWeight: 500 }}>{fmt(brkBal)}</span>
            </div>
          </div>
        )
      }
      if (!hasImportedBrokerage) {
        return (
          <p className="footnote" style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-2)', border: 'none', paddingTop: 0 }}>
            No brokerage / taxable positions found in your saved Fidelity import. Open Configure (gear icon) to import, apply balances, or switch to
            manual entry.
          </p>
        )
      }
      return (
        <div className="edit-row edit-row--portfolio-bucket edit-row--no-divider">
          <PortfolioBucketAccountRow label="Taxable brokerage" total={fmt(brkBal)} trend={brokerageTrend} />
          <BucketHoldingsSubrows
            positions={brokeragePositions}
            keyPrefix="brk"
            importCustodian={importCustodian}
          />
        </div>
      )
    }

    if (configureInputsOnly) {
      if (brokerageMode === 'manual') {
        return (
          <div className="edit-row edit-row--no-divider" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className="edit-row-label">Taxable brokerage</span>
              <div className="num-input-wrap">
                <span className="num-input-prefix">{currencySymbol()}</span>
                <input
                  type="text"
                  className="num-input"
                  value={fmtInput(brkBal)}
                  onChange={(e) => onBrkBal?.(parseNum(e.target.value))}
                />
              </div>
            </div>
            <input type="range" min={0} max={600000} step={1000} value={brkBal} onChange={(e) => onBrkBal?.(Number(e.target.value))} />
          </div>
        )
      }
      return (
        <p className="footnote" style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-2)', border: 'none', paddingTop: 0 }}>
          {hasImportedBrokerage
            ? 'Apply balances from your import to update taxable total. Dollar amount and holdings appear on the main dashboard only—not here.'
            : 'No brokerage / taxable positions in your saved import yet. Drop a CSV above and apply, or switch to manual entry.'}
        </p>
      )
    }

    if (brokerageMode === 'manual') {
      return (
        <div className="edit-row edit-row--no-divider" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span className="edit-row-label">Taxable brokerage</span>
            <div className="num-input-wrap">
              <span className="num-input-prefix">$</span>
              <input
                type="text"
                className="num-input"
                value={fmtInput(brkBal)}
                onChange={(e) => onBrkBal?.(parseNum(e.target.value))}
              />
            </div>
          </div>
          <input type="range" min={0} max={600000} step={1000} value={brkBal} onChange={(e) => onBrkBal?.(Number(e.target.value))} />
        </div>
      )
    }
    if (!hasImportedBrokerage) {
      return (
        <p className="footnote" style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-2)', border: 'none', paddingTop: 0 }}>
          No brokerage / taxable positions found in your saved Fidelity import. Map accounts containing “Brokerage” or “Individual” in the export,
          apply balances, then return here — or switch to manual entry.
        </p>
      )
    }
    return (
      <div className="edit-row edit-row--portfolio-bucket edit-row--no-divider">
        <PortfolioBucketAccountRow label="Taxable brokerage" total={fmt(brkBal)} trend={brokerageTrend} />
        <BucketHoldingsSubrows
          positions={brokeragePositions}
          keyPrefix="brk"
          importCustodian={importCustodian}
        />
      </div>
    )
  }

  return (
    <>
      <div className="input-col-title">Brokerage (taxable)</div>
      {!readOnly ? (
        <div className="balance-input-toolbar balance-input-toolbar--mb-sm">
          <ButtonGroup size="sm" className="balance-mode-button-group" role="group" aria-label="Brokerage balance entry mode">
            <Button
              variant="outline"
              className={brokerageMode === 'manual' ? 'balance-mode-seg-active' : undefined}
              onPress={() => onBrokerageModeChange?.('manual')}
            >
              Manually add value
            </Button>
            <Button
              variant="outline"
              className={brokerageMode === 'imported' ? 'balance-mode-seg-active' : undefined}
              onPress={() => onBrokerageModeChange?.('imported')}
            >
              Use imported CSV
            </Button>
          </ButtonGroup>
          {brokerageMode === 'imported' ? (
            <PositionsCsvImport
              variant="toolbar"
              onApplyBalances={onImportedApplyBalances!}
              onImportApplied={onPositionsImportApplied}
            />
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 'var(--space-1) var(--space-3)',
          marginBottom: 'var(--space-3)',
        }}
      >
        {renderBrokerageBalanceSection()}
      </div>

      {readOnly ? (
        <div
          style={{
            marginBottom: 'var(--space-5)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 'var(--space-2) var(--space-3)',
            background: '#fff',
          }}
        >
          {brokerageReturnPanel}
        </div>
      ) : (
        <details
          className="brokerage-growth-details"
          style={{
            marginBottom: 'var(--space-5)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 'var(--space-2) var(--space-3)',
            background: '#fff',
          }}
        >
          <summary style={{ cursor: 'pointer', fontFamily: 'var(--body)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Brokerage Return
          </summary>
          <div style={{ marginTop: 'var(--space-3)' }}>{brokerageReturnPanel}</div>
        </details>
      )}
    </>
  )
}
