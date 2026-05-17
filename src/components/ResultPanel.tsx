import { useState } from 'react'
import Fraction from 'fraction.js'
import type { SolveResult } from '../types'
import { SolutionSteps } from './SolutionSteps'
import { renderVarDisplay, renderMathExpr } from '../utils/renderMath'

function formatAnswer(val: string): string {
  if (/^-?[0-9]+\.[0-9]+$/.test(val.trim())) {
    try { return new Fraction(val.trim()).toFraction() } catch { /* fall through */ }
  }
  return val
}

interface Props {
  result: SolveResult
  mirroredPairs: Array<{ canonical: string; mirrored: string }>
}

const cellStyle: React.CSSProperties = {
  padding: '5px 12px',
  textAlign: 'center',
  border: '1px solid #2a2a4a',
  color: '#ddd',
  fontFamily: 'monospace',
  fontSize: 13,
}
const headerStyle: React.CSSProperties = {
  ...cellStyle, background: '#252545', color: '#7ecfff', fontStyle: 'italic', fontWeight: 'bold',
}
const augStyle: React.CSSProperties = {
  ...cellStyle, borderLeft: '2px solid #5a5aaa',
}

function MatrixTable({ variables, matrix }: { variables: string[]; matrix: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 10 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {variables.map(v => <th key={v} style={headerStyle}>{renderVarDisplay(v)}</th>)}
            <th style={{ ...headerStyle, ...augStyle }}>b</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#1e1e35' : 'transparent' }}>
              {row.slice(0, -1).map((cell, j) => <td key={j} style={cellStyle}>{renderMathExpr(cell)}</td>)}
              <td style={augStyle}>{renderMathExpr(row[row.length - 1])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ResultPanel({ result, mirroredPairs }: Props) {
  const [showSteps, setShowSteps] = useState(false)

  const handleCopy = () => {
    const text = Object.entries(result.answer)
      .map(([k, v]) => `${k} = ${formatAnswer(v)}`)
      .join('\n')
    navigator.clipboard.writeText(text)
  }

  if (result.status !== 'ok') {
    return (
      <div style={{
        background: '#2a1a1a',
        border: '1.5px solid #7a2a2a',
        borderRadius: 10,
        padding: '16px 20px',
        marginTop: 16,
      }}>
        <div style={{ fontSize: 14, color: '#ff6a6a', fontWeight: 600, marginBottom: 6 }}>
          {result.status === 'underdetermined' && 'Система недоопределена'}
          {result.status === 'inconsistent' && 'Система несовместна'}
          {result.status === 'too_many_vars' && 'Слишком много переменных'}
          {result.status === 'parse_error' && 'Ошибка разбора'}
        </div>
        {result.errorMessage && (
          <div style={{ fontSize: 13, color: '#cc8888' }}>{result.errorMessage}</div>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* Augmented matrix — always visible */}
      {result.initialMatrix && (
        <div style={{
          background: '#1a1a2e',
          border: '1.5px solid #2a2a4a',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Расширенная матрица системы:</div>
          <MatrixTable variables={result.variables} matrix={result.initialMatrix} />
        </div>
      )}

      {/* Toggle for Gauss steps only */}
      {result.steps && result.steps.length > 0 && (
        <button
          onClick={() => setShowSteps(s => !s)}
          style={{
            background: '#252545',
            border: '1px solid #4a4a7a',
            borderRadius: 6,
            color: '#a0a0cc',
            fontSize: 13,
            padding: '5px 14px',
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          {showSteps ? '▲ Скрыть шаги Гаусса' : '▼ Показать шаги Гаусса'}
        </button>
      )}

      {/* Gauss steps (toggled) */}
      {showSteps && result.initialMatrix && result.steps && (
        <div style={{ marginBottom: 16 }}>
          <SolutionSteps
            variables={result.variables}
            initialMatrix={result.initialMatrix}
            steps={result.steps}
            backSubstitution={result.backSubstitution ?? []}
            hideInitialMatrix
          />
          <hr style={{ border: 'none', borderTop: '1px solid #2a2a4a', margin: '16px 0' }} />
        </div>
      )}

      {/* Answer block */}
      <div style={{
        background: '#1a2a1a',
        border: '1.5px solid #2a5a2a',
        borderRadius: 10,
        padding: '14px 18px',
      }}>
        <div style={{
          fontSize: 12,
          color: '#88cc88',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>Ответ</span>
          <button
            onClick={handleCopy}
            style={{
              background: '#1e3a1e',
              border: '1px solid #2a5a2a',
              borderRadius: 5,
              color: '#88cc88',
              fontSize: 12,
              padding: '3px 10px',
              cursor: 'pointer',
            }}
          >
            Копировать
          </button>
        </div>
        {Object.entries(result.answer).map(([k, v]) => {
          const pair = mirroredPairs.find(p => p.canonical === k)
          return (
            <div key={k} style={{ fontFamily: 'monospace', fontSize: 15, color: '#aaffaa', marginBottom: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
              <span>{renderVarDisplay(k)}</span>
              <span style={{ margin: '0 4px' }}>=</span>
              <span>{renderMathExpr(formatAnswer(v))}</span>
              {pair && (
                <span style={{ color: '#666', fontSize: 12, marginLeft: 8 }}>
                  ({renderVarDisplay(pair.mirrored)} = −{renderVarDisplay(k)} = {renderMathExpr(v.startsWith('-') ? v.slice(1) : `−${v}`)})
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
