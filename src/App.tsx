import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import { EquationRow } from './components/EquationRow'
import { Toolbar } from './components/Toolbar'
import { SymbolsPanel } from './components/SymbolsPanel'
import { HistoryPanel } from './components/HistoryPanel'
import { ResultPanel } from './components/ResultPanel'
import { ParameterPanel } from './components/ParameterPanel'
import { normalizeForSolver } from './parser/normalizer'
import { solveNumeric } from './solver/numeric'
import { buildSymbolicMatrix } from './solver/symbolic'
import type { EquationRow as IEquationRow, SolveResult } from './types'

function extractUniqueParams(rows: IEquationRow[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const row of rows) {
    for (const seg of row.segments) {
      if (seg.type !== 'parameter') continue
      const name = seg.value.slice(1, -1).trim()
      if (!seen.has(name)) { seen.add(name); result.push(name) }
    }
  }
  return result
}

export default function App() {
  const { equations, undo, redo, pushHistory, symbolsPanelOpen, appendToRow } = useStore()
  const [result, setResult] = useState<SolveResult | null>(null)
  const [mirroredPairs, setMirroredPairs] = useState<Array<{ canonical: string; mirrored: string }>>([])
  const [paramState, setParamState] = useState<{
    names: string[]
    variables: string[]
    matrix: string[][]
    pairs: Array<{ canonical: string; mirrored: string }>
  } | null>(null)
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
    const { variables, pairs } = normalizeForSolver(equations)
    const paramNames = extractUniqueParams(equations)

    const mirrorMap = new Map<string, { canonical: string; sign: number }>()
    for (const p of pairs) mirrorMap.set(p.mirrored, { canonical: p.canonical, sign: -1 })

    if (paramNames.length > 0) {
      const matrix = buildSymbolicMatrix(equations, variables, mirrorMap)
      setParamState({ names: paramNames, variables, matrix, pairs })
      setResult(null)
      setMirroredPairs([])
      return
    }

    const { equations: normalized } = normalizeForSolver(equations)
    const res = solveNumeric(normalized, variables)
    res.mirroredPairs = pairs
    setResult(res)
    setMirroredPairs(pairs)
    setParamState(null)
    pushHistory(res)
  }

  const handleSolveWithParams = (paramValues: Record<string, number>) => {
    if (!paramState) return
    const { equations: normalized, variables, pairs } = normalizeForSolver(equations, paramValues)
    const mirrorMap = new Map<string, { canonical: string; sign: number }>()
    for (const p of pairs) mirrorMap.set(p.mirrored, { canonical: p.canonical, sign: -1 })
    const res = solveNumeric(normalized, variables)
    res.mirroredPairs = pairs
    res.initialMatrix = paramState.matrix
    setResult(res)
    setMirroredPairs(pairs)
    setParamState(null)
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

          {paramState && (
            <ParameterPanel
              paramNames={paramState.names}
              variables={paramState.variables}
              matrix={paramState.matrix}
              onSolve={handleSolveWithParams}
            />
          )}

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
