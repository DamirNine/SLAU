// @ts-ignore — nerdamer has no bundled types
import nerdamer from 'nerdamer'
// @ts-ignore
import 'nerdamer/Solve'
import type { EquationRow, SolveResult } from '../types'
import { displayName } from '../parser/normalizer'

// Map display variable name to short nerdamer-safe ascii identifier
let _varCounter = 0
const _varCache = new Map<string, string>()
const _reverseCache = new Map<string, string>()

function toNerdVar(display: string): string {
  if (!_varCache.has(display)) {
    const nv = `_v${_varCounter++}`
    _varCache.set(display, nv)
    _reverseCache.set(nv, display)
  }
  return _varCache.get(display)!
}

// Build a nerdamer equation string from one row's segments
function buildNerdEq(
  row: EquationRow,
  varMap: Map<string, string>,
  paramMap: Map<string, string>
): string {
  const segs = row.segments.filter(s => s.type !== 'whitespace')
  let lhs = '', rhs = '', side: 'lhs' | 'rhs' = 'lhs'
  let prevType = ''

  const append = (s: string) => {
    if (side === 'lhs') lhs += s
    else rhs += s
  }

  for (const seg of segs) {
    if (seg.type === 'equals') { side = 'rhs'; prevType = ''; continue }

    // Insert * when parameter/number is directly followed by variable or parameter
    const needsMul = (prevType === 'parameter' || prevType === 'number') &&
                     (seg.type === 'variable' || seg.type === 'parameter')
    if (needsMul) append('*')

    if (seg.type === 'operator' || seg.type === 'number') {
      append(seg.value)
    } else if (seg.type === 'variable') {
      const dn = displayName(seg)
      append(varMap.get(dn) ?? dn)
    } else if (seg.type === 'parameter') {
      const pname = paramMap.get(seg.value) ?? seg.value.slice(1, -1).replace(/[^a-zA-Z0-9]/g, '_')
      append(pname)
    }
    prevType = seg.type
  }

  return `${lhs}=${rhs}`
}

// Convert nerdamer result back to display form
function fromNerdResult(
  result: string,
  reverseVarMap: Map<string, string>,
  reverseParamMap: Map<string, string>
): string {
  let s = result
  // Replace nerd var names with display names (longest first to avoid partial matches)
  const varEntries = [...reverseVarMap.entries()].sort((a, b) => b[0].length - a[0].length)
  for (const [nerd, display] of varEntries) {
    s = s.replaceAll(nerd, display)
  }
  for (const [nerd, display] of reverseParamMap.entries()) {
    s = s.replaceAll(nerd, display)
  }
  return s
}

export function solveSymbolic(rows: EquationRow[], variables: string[]): SolveResult {
  // Reset per-call caches so tests don't bleed into each other
  _varCounter = 0
  _varCache.clear()
  _reverseCache.clear()

  // Build variable maps
  const varMap = new Map<string, string>()
  const reverseVarMap = new Map<string, string>()
  for (const v of variables) {
    const nv = toNerdVar(v)
    varMap.set(v, nv)
    reverseVarMap.set(nv, v)
  }

  // Collect parameters from all rows
  const paramMap = new Map<string, string>()   // "(expr)" → nerd param name
  const reverseParamMap = new Map<string, string>() // nerd param name → display
  let paramIdx = 0
  for (const row of rows) {
    for (const seg of row.segments) {
      if (seg.type !== 'parameter') continue
      if (!paramMap.has(seg.value)) {
        const pname = `p${paramIdx++}`
        const display = seg.value.slice(1, -1).trim()
        paramMap.set(seg.value, pname)
        reverseParamMap.set(pname, display)
      }
    }
  }

  // Build equation strings
  const eqStrings = rows
    .filter(row => row.segments.some(s => s.type === 'equals'))
    .map(row => buildNerdEq(row, varMap, paramMap))

  if (eqStrings.length === 0) {
    return { status: 'parse_error', variables, answer: {}, errorMessage: 'Нет уравнений для решения.' }
  }

  const nerdVars = variables.map(v => varMap.get(v)!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nerd = nerdamer as any

  try {
    const answer: Record<string, string> = {}

    if (eqStrings.length === 1 && nerdVars.length === 1) {
      // Single equation: use nerdamer.solve(lhs-rhs, var)
      const eq = eqStrings[0]
      const [lhs, rhs] = eq.split('=')
      const expr = rhs ? `(${lhs})-(${rhs})` : lhs
      const solutions = nerd.solve(expr, nerdVars[0])
      const raw = String(solutions).replace(/^\[/, '').replace(/\]$/, '').split(',')[0] ?? ''
      answer[variables[0]] = fromNerdResult(raw.trim(), reverseVarMap, reverseParamMap)
    } else {
      // Multiple equations: use solveEquations
      const solutions = nerd.solveEquations(eqStrings, nerdVars)
      if (Array.isArray(solutions)) {
        for (let i = 0; i < variables.length; i++) {
          const raw = Array.isArray(solutions[i]) ? String(solutions[i][0] ?? '') : String(solutions[i] ?? '')
          answer[variables[i]] = fromNerdResult(raw, reverseVarMap, reverseParamMap)
        }
      } else {
        // solveEquations returns flat array: [var1, val1, var2, val2, ...]
        const str = String(solutions)
        const parts = str.split(',')
        for (let i = 0; i + 1 < parts.length; i += 2) {
          const nv = parts[i].trim()
          const val = parts[i + 1].trim()
          const display = reverseVarMap.get(nv)
          if (display) answer[display] = fromNerdResult(val, reverseVarMap, reverseParamMap)
        }
      }
    }

    return { status: 'ok', variables, answer }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { status: 'parse_error', variables, answer: {}, errorMessage: msg }
  }
}
