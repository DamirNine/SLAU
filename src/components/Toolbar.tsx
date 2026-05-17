import { useStore } from '../store'

interface Props {
  onSolve: () => void
}

const btn = (disabled = false): React.CSSProperties => ({
  background: '#252545',
  border: '1px solid #4a4a7a',
  borderRadius: 6,
  color: disabled ? '#444' : '#a0a0cc',
  fontSize: 14,
  padding: '6px 12px',
  cursor: disabled ? 'default' : 'pointer',
  transition: 'background 0.15s',
})

export function Toolbar({ onSolve }: Props) {
  const { undo, redo, clearAll, addRow, toggleSymbolsPanel, toggleHistoryPanel, past, future } = useStore()

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  const handleClearAll = () => {
    if (window.confirm('Стереть все уравнения?')) clearAll()
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
      <button style={btn(!canUndo)} onClick={undo} disabled={!canUndo} title="Отменить (Ctrl+Z)">↩</button>
      <button style={btn(!canRedo)} onClick={redo} disabled={!canRedo} title="Повторить (Ctrl+Y)">↪</button>
      <button style={btn()} onClick={addRow}>+ уравнение</button>
      <button style={btn()} onClick={handleClearAll}>Стереть всё</button>
      <button style={btn()} onClick={toggleSymbolsPanel}>Ω Символы ТММ</button>
      <button style={btn()} onClick={toggleHistoryPanel}>🕒 История</button>
      <button
        onClick={onSolve}
        style={{
          background: 'linear-gradient(135deg, #3a5fff, #6a3fff)',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontSize: 15,
          padding: '8px 24px',
          cursor: 'pointer',
          marginLeft: 'auto',
          boxShadow: '0 2px 12px #3a5fff55',
        }}
      >
        Решить СЛАУ
      </button>
    </div>
  )
}
