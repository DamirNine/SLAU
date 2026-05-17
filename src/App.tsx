import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import { EquationRow } from './components/EquationRow'
import { Toolbar } from './components/Toolbar'
import { SymbolsPanel } from './components/SymbolsPanel'
import { HistoryPanel } from './components/HistoryPanel'
import { ResultPanel } from './components/ResultPanel'
import { normalizeForSolver, extractVariables } from './parser/normalizer'
import { solveNumeric } from './solver/numeric'
import { solveSymbolic } from './solver/symbolic'
import type { SolveResult } from './types'

export default function App() {
  const { equations, undo, redo, pushHistory, symbolsPanelOpen, appendToRow } = useStore()
  const [result, setResult] = useState<SolveResult | null>(null)
  const [mirroredPairs, setMirroredPairs] = useState<Array<{ canonical: string; mirrored: string }>>([])
  const activeRowId = useRef<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  const handleSolve = () => {
    const { equations: normalized, variables, pairs } = normalizeForSolver(equations)
    const hasParams = equations.some(row => row.segments.some(s => s.type === 'parameter'))

    let res: SolveResult
    if (hasParams) {
      const vars = extractVariables(equations)
      res = solveSymbolic(equations, vars)
    } else {
      res = solveNumeric(normalized, variables)
    }
    res.mirroredPairs = pairs

    setResult(res)
    setMirroredPairs(pairs)
    pushHistory(res)
  }

  const handleInsertSymbol = (symbol: string) => {
    const id = activeRowId.current ?? equations[equations.length - 1]?.id
    if (!id) return
    appendToRow(id, symbol)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 22, color: '#a0cfff', marginBottom: 4 }}>Решатель СЛАУ</h1>
      <p style={{ fontSize: 12, color: '#555', marginBottom: 20 }}>
        Система линейных алгебраических уравнений · ТММ
      </p>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Toolbar onSolve={handleSolve} />

          {equations.map((row, i) => (
            <div key={row.id} onFocus={() => { activeRowId.current = row.id }}>
              <EquationRow row={row} index={i} />
            </div>
          ))}

          {result && (
            <ResultPanel result={result} mirroredPairs={mirroredPairs} />
          )}
        </div>

        {symbolsPanelOpen && (
          <SymbolsPanel onInsert={handleInsertSymbol} />
        )}
      </div>

      {symbolsPanelOpen && (
        <SymbolsPanel onInsert={handleInsertSymbol} mobile />
      )}

      <HistoryPanel />
    </div>
  )
}
