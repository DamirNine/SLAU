import { create } from 'zustand'
import type { EquationRow, HistoryEntry, SolveResult } from './types'
import { tokenize, mergeIndices } from './parser/tokenizer'

const STORAGE_KEY = 'slau_equations'
const HISTORY_KEY = 'slau_history'
const UNDO_LIMIT = 50

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function emptyRow(): EquationRow {
  return { id: makeId(), rawText: '', segments: [] }
}

function loadEquations(): EquationRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return [emptyRow()]
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

interface State {
  equations: EquationRow[]
  past: EquationRow[][]
  future: EquationRow[][]
  history: HistoryEntry[]
  symbolsPanelOpen: boolean
  historyPanelOpen: boolean

  updateRow: (id: string, rawText: string) => void
  setSegmentIndex: (rowId: string, segId: string, sub: string, sup: string) => void
  addRow: () => void
  removeRow: (id: string) => void
  clearAll: () => void
  undo: () => void
  redo: () => void
  pushHistory: (result: SolveResult) => void
  loadFromHistory: (entry: HistoryEntry) => void
  toggleSymbolsPanel: () => void
  toggleHistoryPanel: () => void
  appendToRow: (id: string, symbol: string) => void
}

function save(equations: EquationRow[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(equations)) } catch { /* ignore */ }
}

export const useStore = create<State>((set, get) => ({
  equations: loadEquations(),
  past: [],
  future: [],
  history: loadHistory(),
  symbolsPanelOpen: false,
  historyPanelOpen: false,

  updateRow(id, rawText) {
    const { equations, past } = get()
    const row = equations.find(r => r.id === id)
    if (!row) return
    const fresh = tokenize(rawText)
    const merged = mergeIndices(fresh, row.segments)
    const next = equations.map(r => r.id === id ? { ...r, rawText, segments: merged } : r)
    save(next)
    set({ equations: next, past: [...past.slice(-(UNDO_LIMIT - 1)), equations], future: [] })
  },

  setSegmentIndex(rowId, segId, sub, sup) {
    const { equations, past } = get()
    const next = equations.map(row => {
      if (row.id !== rowId) return row
      return { ...row, segments: row.segments.map(s => s.id === segId ? { ...s, sub, sup } : s) }
    })
    save(next)
    set({ equations: next, past: [...past.slice(-(UNDO_LIMIT - 1)), equations], future: [] })
  },

  addRow() {
    const { equations, past } = get()
    const next = [...equations, emptyRow()]
    save(next)
    set({ equations: next, past: [...past.slice(-(UNDO_LIMIT - 1)), equations], future: [] })
  },

  removeRow(id) {
    const { equations, past } = get()
    const next = equations.length > 1 ? equations.filter(r => r.id !== id) : [emptyRow()]
    save(next)
    set({ equations: next, past: [...past.slice(-(UNDO_LIMIT - 1)), equations], future: [] })
  },

  clearAll() {
    const { past, equations } = get()
    const next = [emptyRow()]
    save(next)
    set({ equations: next, past: [...past.slice(-(UNDO_LIMIT - 1)), equations], future: [] })
  },

  undo() {
    const { past, equations, future } = get()
    if (!past.length) return
    const prev = past[past.length - 1]
    save(prev)
    set({ equations: prev, past: past.slice(0, -1), future: [equations, ...future.slice(0, UNDO_LIMIT - 1)] })
  },

  redo() {
    const { past, equations, future } = get()
    if (!future.length) return
    const next = future[0]
    save(next)
    set({ equations: next, past: [...past.slice(-(UNDO_LIMIT - 1)), equations], future: future.slice(1) })
  },

  pushHistory(result) {
    const { equations, history } = get()
    const entry: HistoryEntry = {
      id: makeId(),
      timestamp: Date.now(),
      equations: JSON.parse(JSON.stringify(equations)),
      result,
      preview: (equations[0]?.rawText ?? '').slice(0, 40),
    }
    const next = [entry, ...history].slice(0, 10)
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    set({ history: next })
  },

  loadFromHistory(entry) {
    const { past, equations } = get()
    save(entry.equations)
    set({ equations: entry.equations, past: [...past.slice(-(UNDO_LIMIT - 1)), equations], future: [] })
  },

  appendToRow(id, symbol) {
    const { equations } = get()
    const row = equations.find(r => r.id === id)
    if (!row) return
    get().updateRow(id, row.rawText + symbol)
  },

  toggleSymbolsPanel: () => set(s => ({ symbolsPanelOpen: !s.symbolsPanelOpen })),
  toggleHistoryPanel: () => set(s => ({ historyPanelOpen: !s.historyPanelOpen })),
}))
