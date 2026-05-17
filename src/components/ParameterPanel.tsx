import { useState } from 'react'
import { renderVarDisplay, renderMathExpr } from '../utils/renderMath'

interface Props {
  paramNames: string[]
  variables: string[]
  matrix: string[][]
  onSolve: (values: Record<string, number>) => void
}

const cell: React.CSSProperties = {
  padding: '5px 12px', textAlign: 'center',
  border: '1px solid #2a2a4a', color: '#ddd', fontFamily: 'monospace', fontSize: 13,
}
const header: React.CSSProperties = {
  ...cell, background: '#252545', color: '#7ecfff', fontStyle: 'italic', fontWeight: 'bold',
}
const aug: React.CSSProperties = { ...cell, borderLeft: '2px solid #5a5aaa' }

export function ParameterPanel({ paramNames, variables, matrix, onSolve }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(paramNames.map(n => [n, '']))
  )

  const allFilled = paramNames.every(n => {
    const v = values[n].trim()
    return v !== '' && !isNaN(parseFloat(v))
  })

  const handleSubmit = () => {
    const nums: Record<string, number> = {}
    for (const [k, v] of Object.entries(values)) nums[k] = parseFloat(v)
    onSolve(nums)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && allFilled) handleSubmit()
  }

  return (
    <div style={{ marginTop: 16 }}>
      {/* Symbolic matrix */}
      <div style={{ background: '#1a1a2e', border: '1.5px solid #2a2a4a', borderRadius: 10, padding: '12px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Расширенная матрица системы:</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {variables.map(v => <th key={v} style={header}>{renderVarDisplay(v)}</th>)}
                <th style={{ ...header, ...aug }}>b</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? '#1e1e35' : 'transparent' }}>
                  {row.slice(0, -1).map((c, j) => <td key={j} style={cell}>{renderMathExpr(c)}</td>)}
                  <td style={aug}>{renderMathExpr(row[row.length - 1])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parameter inputs */}
      <div style={{ background: '#1a1a2e', border: '1.5px solid #2a2a4a', borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Введи значения параметров:</div>
        {paramNames.map(name => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 16, color: '#ffa040', minWidth: 32 }}>{name}</span>
            <span style={{ color: '#666', fontSize: 14 }}>=</span>
            <input
              type="text"
              inputMode="decimal"
              value={values[name]}
              onChange={e => setValues(prev => ({ ...prev, [name]: e.target.value }))}
              onKeyDown={handleKey}
              placeholder="число"
              style={{
                background: '#1e1e30',
                border: '1.5px solid #3a3a5a',
                borderRadius: 6,
                padding: '5px 10px',
                color: '#e0e0e0',
                fontSize: 14,
                width: 110,
                outline: 'none',
                fontFamily: 'monospace',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#5a5aaa')}
              onBlur={e => (e.currentTarget.style.borderColor = '#3a3a5a')}
            />
          </div>
        ))}
        <button
          disabled={!allFilled}
          onClick={handleSubmit}
          style={{
            marginTop: 4,
            background: allFilled ? '#1e3a1e' : '#161622',
            border: `1px solid ${allFilled ? '#2a5a2a' : '#333'}`,
            borderRadius: 6,
            color: allFilled ? '#88cc88' : '#444',
            fontSize: 14,
            padding: '6px 18px',
            cursor: allFilled ? 'pointer' : 'not-allowed',
          }}
        >
          Вычислить
        </button>
      </div>
    </div>
  )
}
