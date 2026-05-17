import type { GaussStep } from '../types'

interface Props {
  variables: string[]
  initialMatrix: string[][]
  steps: GaussStep[]
  backSubstitution: string[]
  hideInitialMatrix?: boolean
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
  ...cellStyle,
  background: '#252545',
  color: '#7ecfff',
  fontStyle: 'italic',
  fontWeight: 'bold',
}

const augStyle: React.CSSProperties = {
  ...cellStyle,
  borderLeft: '2px solid #5a5aaa',
}

function MatrixTable({ variables, matrix }: { variables: string[]; matrix: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 10 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {variables.map(v => <th key={v} style={headerStyle}>{v}</th>)}
            <th style={{ ...headerStyle, ...augStyle }}>b</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#1e1e35' : 'transparent' }}>
              {row.slice(0, -1).map((cell, j) => <td key={j} style={cellStyle}>{cell}</td>)}
              <td style={augStyle}>{row[row.length - 1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SolutionSteps({ variables, initialMatrix, steps, backSubstitution, hideInitialMatrix }: Props) {
  return (
    <div>
      {!hideInitialMatrix && (
        <>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Расширенная матрица системы:</div>
          <MatrixTable variables={variables} matrix={initialMatrix} />
        </>
      )}

      {steps.map((step, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Шаг {i + 1}</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#ffe07e', marginBottom: 6 }}>{step.desc}</div>
          <MatrixTable variables={variables} matrix={step.matrix} />
        </div>
      ))}

      {backSubstitution.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Обратный ход:</div>
          {backSubstitution.map((line, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: 13, color: '#ffe07e', marginBottom: 3 }}>{line}</div>
          ))}
        </div>
      )}
    </div>
  )
}
