import { useRef, useState, useCallback } from 'react'
import type { EquationRow as IEquationRow, Segment } from '../types'
import { IndexPopup } from './IndexPopup'
import { useStore } from '../store'
import { displayName } from '../parser/normalizer'

interface Props {
  row: IEquationRow
  index: number
}

export function EquationRow({ row, index }: Props) {
  const { updateRow, setSegmentIndex, removeRow } = useStore()
  const [popup, setPopup] = useState<{ seg: Segment; rect: DOMRect } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateRow(row.id, e.target.value)
  }

  const handleSegClick = useCallback((seg: Segment, e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopup({ seg, rect })
  }, [])

  const handleRemove = () => {
    if (window.confirm('Удалить это уравнение?')) removeRow(row.id)
  }

  const hasVariables = row.segments.some(s => s.type === 'variable')
  const hasContent = row.rawText.trim().length > 0

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <span style={{ color: '#555', fontSize: 13, width: 24, textAlign: 'right', paddingTop: 11, flexShrink: 0 }}>
        {index + 1}.
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Visible input — standard cursor, full text visible */}
        <input
          ref={inputRef}
          value={row.rawText}
          onChange={handleChange}
          placeholder="введи уравнение..."
          style={{
            width: '100%',
            background: '#1e1e30',
            border: '1.5px solid #3a3a5a',
            borderRadius: hasContent ? '8px 8px 0 0' : 8,
            outline: 'none',
            fontSize: 16,
            padding: '8px 12px',
            color: '#e0e0e0',
            caretColor: '#a0cfff',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#5a5aaa')}
          onBlur={e => (e.currentTarget.style.borderColor = '#3a3a5a')}
        />

        {/* Parsed chip preview — only when there's content */}
        {hasContent && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 3,
            padding: '5px 10px',
            background: '#16162a',
            borderLeft: '1.5px solid #3a3a5a',
            borderRight: '1.5px solid #3a3a5a',
            borderBottom: '1.5px solid #3a3a5a',
            borderRadius: '0 0 8px 8px',
          }}>
            {row.segments.map(seg => {
              if (seg.type === 'whitespace') {
                return <span key={seg.id} style={{ display: 'inline-block', width: 4 }} />
              }
              if (seg.type === 'variable') {
                return (
                  <span
                    key={seg.id}
                    title="Кликни для индексов"
                    onClick={e => handleSegClick(seg, e)}
                    style={{
                      color: '#a0cfff',
                      background: '#2a2a44',
                      border: '1.5px solid #4a4aaa',
                      borderRadius: 5,
                      padding: '0 5px',
                      cursor: 'pointer',
                      fontSize: 14,
                      userSelect: 'none',
                    }}
                  >
                    {displayName(seg)}
                  </span>
                )
              }
              if (seg.type === 'parameter') {
                return (
                  <span
                    key={seg.id}
                    title="Параметр"
                    style={{
                      color: '#ffa040',
                      background: '#2a1a00',
                      border: '1.5px solid #7a5a00',
                      borderRadius: 5,
                      padding: '0 5px',
                      fontSize: 14,
                      userSelect: 'none',
                    }}
                  >
                    {seg.value}
                  </span>
                )
              }
              return (
                <span
                  key={seg.id}
                  style={{
                    fontSize: 14,
                    color: seg.type === 'operator' || seg.type === 'equals'
                      ? '#888' : seg.type === 'number' ? '#e0e0e0' : '#ccc',
                  }}
                >
                  {seg.value}
                </span>
              )
            })}
            {hasVariables && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#444', paddingLeft: 8 }}>
                кликни переменную для индекса
              </span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleRemove}
        title="Удалить уравнение"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#444',
          fontSize: 18,
          cursor: 'pointer',
          paddingTop: 8,
          lineHeight: 1,
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#cc4444')}
        onMouseLeave={e => (e.currentTarget.style.color = '#444')}
      >
        ✕
      </button>

      {popup && (
        <IndexPopup
          seg={popup.seg}
          anchorRect={popup.rect}
          onSave={(sub, sup) => setSegmentIndex(row.id, popup.seg.id, sub, sup)}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}
