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

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <span style={{ color: '#555', fontSize: 13, width: 24, textAlign: 'right', paddingTop: 11, flexShrink: 0 }}>
        {index + 1}.
      </span>

      {/* Wrapper: positions input behind token display */}
      <div style={{ flex: 1, position: 'relative', minHeight: 42 }}>
        {/* Transparent input: accepts typing, caret visible */}
        <input
          ref={inputRef}
          value={row.rawText}
          onChange={handleChange}
          placeholder=" "
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: '1.5px solid transparent',
            borderRadius: 8,
            outline: 'none',
            fontSize: 16,
            padding: '8px 12px',
            color: 'transparent',
            caretColor: '#a0cfff',
            zIndex: 1,
            cursor: 'text',
          }}
        />

        {/* Visual overlay: token chips + border */}
        <div
          onClick={() => inputRef.current?.focus()}
          style={{
            background: '#1e1e30',
            border: '1.5px solid #3a3a5a',
            borderRadius: 8,
            padding: '8px 12px',
            minHeight: 42,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 3,
            fontSize: 16,
            cursor: 'text',
            pointerEvents: 'none', // let clicks pass to input below
            position: 'relative',
            zIndex: 0,
          }}
        >
          {row.rawText === '' && (
            <span style={{ color: '#444' }}>введи уравнение...</span>
          )}
          {row.segments.map(seg => {
            if (seg.type === 'whitespace') {
              return <span key={seg.id} style={{ display: 'inline-block', width: 5 }} />
            }
            if (seg.type === 'variable' || seg.type === 'parameter') {
              const isVar = seg.type === 'variable'
              return (
                <span
                  key={seg.id}
                  title={isVar ? 'Кликни для индексов' : 'Параметр — кликни для индексов'}
                  onClick={e => handleSegClick(seg, e)}
                  style={{
                    color: isVar ? '#a0cfff' : '#ffa040',
                    background: isVar ? '#2a2a44' : '#2a1a00',
                    border: `1.5px solid ${isVar ? '#4a4aaa' : '#7a5a00'}`,
                    borderRadius: 5,
                    padding: '0 5px',
                    cursor: 'pointer',
                    fontSize: 15,
                    userSelect: 'none',
                    position: 'relative',
                    zIndex: 3,         // above the input (z-index 1)
                    pointerEvents: 'auto',
                  }}
                >
                  {isVar ? displayName(seg) : seg.value}
                </span>
              )
            }
            return (
              <span
                key={seg.id}
                style={{
                  color: seg.type === 'operator' || seg.type === 'equals'
                    ? '#888' : seg.type === 'number' ? '#e0e0e0' : '#ccc',
                }}
              >
                {seg.value}
              </span>
            )
          })}
        </div>
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
