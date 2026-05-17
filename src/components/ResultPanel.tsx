import { useState } from 'react'
import type { SolveResult } from '../types'
import { SolutionSteps } from './SolutionSteps'

interface Props {
  result: SolveResult
  mirroredPairs: Array<{ canonical: string; mirrored: string }>
}

export function ResultPanel({ result, mirroredPairs }: Props) {
  const [showSteps, setShowSteps] = useState(false)

  const handleCopy = () => {
    const text = Object.entries(result.answer)
      .map(([k, v]) => `${k} = ${v}`)
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
        {showSteps ? '▲ Скрыть решение' : '▼ Показать решение'}
      </button>

      {showSteps && result.initialMatrix && result.steps && (
        <div style={{ marginBottom: 16 }}>
          <SolutionSteps
            variables={result.variables}
            initialMatrix={result.initialMatrix}
            steps={result.steps}
            backSubstitution={result.backSubstitution ?? []}
          />
          <hr style={{ border: 'none', borderTop: '1px solid #2a2a4a', margin: '16px 0' }} />
        </div>
      )}

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
            <div key={k} style={{ fontFamily: 'monospace', fontSize: 15, color: '#aaffaa', marginBottom: 6 }}>
              {k} = {v}
              {pair && (
                <span style={{ color: '#666', fontSize: 12, marginLeft: 12 }}>
                  ({pair.mirrored} = −{k} = {v.startsWith('-') ? v.slice(1) : `−${v}`})
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
