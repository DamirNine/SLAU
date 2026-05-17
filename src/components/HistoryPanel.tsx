import { useStore } from '../store'
import type { HistoryEntry } from '../types'

export function HistoryPanel() {
  const { historyPanelOpen, toggleHistoryPanel, history, loadFromHistory, equations } = useStore()
  if (!historyPanelOpen) return null

  const handleLoad = (entry: HistoryEntry) => {
    const hasContent = equations.some(r => r.rawText.trim().length > 0)
    if (hasContent && !window.confirm('Заменить текущие уравнения записью из истории?')) return
    loadFromHistory(entry)
    toggleHistoryPanel()
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: 300,
      background: '#1a1a2e',
      borderLeft: '1.5px solid #3a3a5a',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        background: '#22223a',
        padding: '12px 16px',
        fontSize: 14,
        fontWeight: 600,
        color: '#a0cfff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #3a3a5a',
        flexShrink: 0,
      }}>
        История решений
        <span
          style={{ color: '#555', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
          onClick={toggleHistoryPanel}
        >
          ✕
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {history.length === 0 && (
          <p style={{ color: '#555', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
            История пуста
          </p>
        )}
        {history.map(entry => (
          <div
            key={entry.id}
            onClick={() => handleLoad(entry)}
            style={{
              background: '#22223a',
              border: '1px solid #3a3a5a',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 8,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#5a5aaa')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#3a3a5a')}
          >
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
              {new Date(entry.timestamp).toLocaleString('ru')}
            </div>
            <div style={{
              fontSize: 13,
              color: '#ccc',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {entry.preview || '(пусто)'}
            </div>
            <div style={{
              fontSize: 11,
              color: entry.result.status === 'ok' ? '#5aff5a' : '#ff6a6a',
              marginTop: 4,
            }}>
              {entry.result.status === 'ok'
                ? `✓ Решено (${entry.equations.length} ур.)`
                : `✗ ${(entry.result.errorMessage ?? '').slice(0, 40)}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
