import { useRef, useEffect, useState } from 'react'
import type { Segment } from '../types'

interface Props {
  seg: Segment
  onSave: (sub: string, sup: string) => void
  onClose: () => void
  anchorRect: DOMRect
}

export function IndexPopup({ seg, onSave, onClose, anchorRect }: Props) {
  const [sub, setSub] = useState(seg.sub)
  const [sup, setSup] = useState(seg.sup)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter') { onSave(sub, sup); onClose() }
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [sub, sup, onClose, onSave])

  const top = Math.min(anchorRect.bottom + 6, window.innerHeight - 160)
  const left = Math.min(anchorRect.left, window.innerWidth - 200)

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 1000,
        background: '#252540',
        border: '1px solid #4a4a7a',
        borderRadius: 8,
        padding: '10px 12px',
        boxShadow: '0 4px 16px #00000088',
        minWidth: 190,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ fontSize: 11, color: '#888' }}>
        Переменная: <b style={{ color: '#a0cfff' }}>{seg.value}</b>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <span style={{ color: '#aaa', width: 130 }}>
          Верхний индекс <sup style={{ color: '#ffe07e' }}>□</sup>
        </span>
        <input
          autoFocus
          value={sup}
          onChange={e => setSup(e.target.value)}
          placeholder="нет"
          style={{
            width: 55,
            background: '#1e1e30',
            border: '1px solid #5a5a9a',
            borderRadius: 4,
            color: '#fff',
            padding: '2px 6px',
            fontSize: 13,
            outline: 'none',
          }}
        />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <span style={{ color: '#aaa', width: 130 }}>
          Нижний индекс <sub style={{ color: '#7ecfff' }}>□</sub>
        </span>
        <input
          value={sub}
          onChange={e => setSub(e.target.value)}
          placeholder="нет"
          style={{
            width: 55,
            background: '#1e1e30',
            border: '1px solid #5a5a9a',
            borderRadius: 4,
            color: '#fff',
            padding: '2px 6px',
            fontSize: 13,
            outline: 'none',
          }}
        />
      </label>
      <button
        onClick={() => { onSave(sub, sup); onClose() }}
        style={{
          alignSelf: 'flex-end',
          background: '#3a5fff',
          border: 'none',
          borderRadius: 5,
          color: '#fff',
          padding: '4px 12px',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        OK
      </button>
    </div>
  )
}
