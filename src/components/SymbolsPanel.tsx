import { useStore } from '../store'

const SYMBOL_GROUPS = [
  { title: 'Угловые', symbols: ['ω', 'φ', 'α', 'β', 'θ', 'ψ', 'Φ', 'Θ', 'Ψ'] },
  { title: 'Скорости / ускорения', symbols: ['ε', 'δ', 'λ', 'ν', 'ζ', 'η', 'κ'] },
  { title: 'Геометрия', symbols: ['ρ', 'μ', 'σ', 'τ', 'Δ', 'Λ'] },
  { title: 'Греческий (прочие)', symbols: ['γ', 'ξ', 'χ', 'π', 'Σ', 'Π', 'Γ', 'Ξ', 'Ω'] },
]

interface Props {
  onInsert: (symbol: string) => void
  mobile?: boolean
}

export function SymbolsPanel({ onInsert, mobile = false }: Props) {
  const panelStyle: React.CSSProperties = mobile
    ? { background: '#1a1a2e', border: '1.5px solid #3a3a5a', borderRadius: '12px 12px 0 0', overflow: 'hidden' }
    : { width: 220, background: '#1a1a2e', border: '1.5px solid #3a3a5a', borderRadius: 12, overflow: 'hidden', flexShrink: 0 }
  const { symbolsPanelOpen, toggleSymbolsPanel } = useStore()
  if (!symbolsPanelOpen) return null

  return (
    <div className={mobile ? 'symbols-panel-mobile' : 'symbols-panel-desktop'} style={panelStyle}>
      <div style={{
        background: '#22223a',
        padding: '10px 14px',
        fontSize: 13,
        fontWeight: 600,
        color: '#a0cfff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #3a3a5a',
      }}>
        Символы ТММ
        <span
          style={{ color: '#555', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          onClick={toggleSymbolsPanel}
        >
          ✕
        </span>
      </div>
      {SYMBOL_GROUPS.map(group => (
        <div key={group.title} style={{ padding: '10px 12px', borderBottom: '1px solid #252545' }}>
          <div style={{
            fontSize: 10,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 8,
          }}>
            {group.title}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {group.symbols.map(sym => (
              <button
                key={sym}
                onClick={() => onInsert(sym)}
                title={sym}
                style={{
                  background: '#252545',
                  border: '1px solid #3a3a6a',
                  borderRadius: 5,
                  color: '#ddd',
                  fontSize: 17,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  minWidth: 36,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#33336a')}
                onMouseLeave={e => (e.currentTarget.style.background = '#252545')}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div style={{ padding: '8px 12px', fontSize: 11, color: '#555' }}>
        Кликни символ — вставится в активное уравнение
      </div>
    </div>
  )
}
