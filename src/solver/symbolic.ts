// @ts-ignore — nerdamer has no bundled types
import nerdamer from 'nerdamer'
// @ts-ignore
import 'nerdamer/Solve'
import type { EquationRow, SolveResult } from '../types'
import { displayName } from '../parser/normalizer'

let _varCounter = 0
const _varCache = new Map<string, string>()

function toNerdVar(display: string): string {
  if (!_varCache.has(display)) {
    // No underscore prefix — nerdamer crashes on names starting with '_'
    _varCache.set(display, `vv${_varCounter++}`)
  }
  return _varCache.get(display)!
}

function buildNerdEq(
  row: EquationRow,
  varMap: Map<string, string>,
  paramMap: Map<string, string>
): string {
  const segs = row.segments.filter(s => s.type !== 'whitespace')
  let lhs = '', rhs = '', side: 'lhs' | 'rhs' = 'lhs'
  let prevType = ''

  const append = (s: string) => { if (side === 'lhs') lhs += s; else rhs += s }

  for (const seg of segs) {
    if (seg.type === 'equals') { side = 'rhs'; prevType = ''; continue }
    const needsMul = (prevType === 'parameter' || prevType === 'number') &&
                     (seg.type === 'variable' || seg.type === 'parameter')
    if (needsMul) append('*')
    if (seg.type === 'operator' || seg.type === 'number') {
      append(seg.value)
    } else if (seg.type === 'variable') {
      append(varMap.get(displayName(seg)) ?? displayName(seg))
    } else if (seg.type === 'parameter') {
      append(paramMap.get(seg.value) ?? seg.value.slice(1, -1))
    }
    prevType = seg.type
  }
  return `${lhs}=${rhs}`
}

function fromNerdResult(
  result: string,
  reverseVarMap: Map<string, string>,
  reverseParamMap: Map<string, string>
): string {
  let s = result
  const varEntries = [...reverseVarMap.entries()].sort((a, b) => b[0].length - a[0].length)
  for (const [nerd, display] of varEntries) s = s.replaceAll(nerd, display)
  for (const [nerd, display] of reverseParamMap.entries()) s = s.replaceAll(nerd, display)
  return s
}

// Build augmented matrix with symbolic coefficients for display
function buildSymbolicMatrix(rows: EquationRow[], variables: string[]): string[][] {
  return rows
    .filter(r => r.segments.some(s => s.type === 'equals'))
    .map(row => {
      const segs = row.segments.filter(s => s.type !== 'whitespace')
      const coeffParts: Record<string, string[]> = {}
      for (const v of variables) coeffParts[v] = []
      const rhsParts: string[] = []

      let sign = 1
      let pendingNum: number | null = null
      let pendingParam: string | null = null
      let onRhs = false

      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i]

        if (seg.type === 'equals') {
          onRhs = true; sign = 1; pendingNum = null; pendingParam = null; continue
        }

        if (seg.type === 'operator') {
          if (seg.value === '-') { sign = -1; pendingNum = null; pendingParam = null }
          else if (seg.value === '+') { sign = 1; pendingNum = null; pendingParam = null }
          // '*': preserve pending coefficient
          continue
        }

        if (seg.type === 'number') {
          pendingNum = parseFloat(seg.value) * sign
          const next = segs[i + 1]
          const afterStar = next?.value === '*' ? segs[i + 2] : null
          if (next?.type !== 'variable' && afterStar?.type !== 'variable') {
            const val = String(pendingNum)
            if (onRhs) rhsParts.push(val)
            else rhsParts.push(String(-pendingNum))
            pendingNum = null; sign = 1
          }
          continue
        }

        if (seg.type === 'parameter') {
          const content = seg.value.slice(1, -1).trim()
          pendingParam = sign < 0 ? `-${content}` : content
          sign = 1
          const next = segs[i + 1]
          const afterStar = next?.value === '*' ? segs[i + 2] : null
          if (next?.type !== 'variable' && afterStar?.type !== 'variable') {
            // Standalone parameter: goes to RHS (its side)
            if (onRhs) rhsParts.push(pendingParam)
            else rhsParts.push(sign < 0 ? pendingParam : `-${pendingParam}`)
            pendingParam = null; sign = 1
          }
          continue
        }

        if (seg.type === 'variable') {
          const dn = displayName(seg)
          let coeff: string
          if (pendingParam !== null && pendingNum !== null) {
            coeff = `${pendingNum}${pendingParam}`
          } else if (pendingParam !== null) {
            coeff = pendingParam
          } else if (pendingNum !== null) {
            coeff = String(pendingNum)
          } else {
            coeff = sign > 0 ? '1' : '-1'
          }
          pendingNum = null; pendingParam = null; sign = 1

          if (variables.includes(dn)) {
            if (onRhs) {
              // Variable on RHS → negate and move to LHS coefficients
              const negated = coeff.startsWith('-') ? coeff.slice(1) : `-${coeff}`
              coeffParts[dn].push(negated)
            } else {
              coeffParts[dn].push(coeff)
            }
          }
          continue
        }
      }

      const joinParts = (parts: string[]) => {
        if (parts.length === 0) return '0'
        let r = parts[0]
        for (let j = 1; j < parts.length; j++) {
          r += parts[j].startsWith('-') ? parts[j] : `+${parts[j]}`
        }
        return r
      }

      return [...variables.map(v => joinParts(coeffParts[v])), joinParts(rhsParts)]
    })
}

export function solveSymbolic(rows: EquationRow[], variables: string[]): SolveResult {
  _varCounter = 0
  _varCache.clear()

  const varMap = new Map<string, string>()
  const reverseVarMap = new Map<string, string>()
  for (const v of variables) {
    const nv = toNerdVar(v)
    varMap.set(v, nv)
    reverseVarMap.set(nv, v)
  }

  const paramMap = new Map<string, string>()
  const reverseParamMap = new Map<string, string>()
  let paramIdx = 0
  for (const row of rows) {
    for (const seg of row.segments) {
      if (seg.type !== 'parameter') continue
      if (!paramMap.has(seg.value)) {
        const pname = `p${paramIdx++}`
        paramMap.set(seg.value, pname)
        reverseParamMap.set(pname, seg.value.slice(1, -1).trim())
      }
    }
  }

  const eqStrings = rows
    .filter(row => row.segments.some(s => s.type === 'equals'))
    .map(row => buildNerdEq(row, varMap, paramMap))

  if (eqStrings.length === 0) {
    return { status: 'parse_error', variables, answer: {}, errorMessage: 'Нет уравнений для решения.' }
  }

  const initialMatrix = buildSymbolicMatrix(rows, variables)
  const nerdVars = variables.map(v => varMap.get(v)!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nerd = nerdamer as any

  try {
    const answer: Record<string, string> = {}

    if (eqStrings.length === 1 && nerdVars.length === 1) {
      const [lhs, rhs] = eqStrings[0].split('=')
      const expr = rhs ? `(${lhs})-(${rhs})` : lhs
      const solutions = nerd.solve(expr, nerdVars[0])
      const raw = String(solutions).replace(/^\[/, '').replace(/\]$/, '').split(',')[0] ?? ''
      answer[variables[0]] = fromNerdResult(raw.trim(), reverseVarMap, reverseParamMap)
    } else {
      const solutions = nerd.solveEquations(eqStrings, nerdVars)
      if (Array.isArray(solutions)) {
        for (let i = 0; i < variables.length; i++) {
          const raw = Array.isArray(solutions[i])
            ? String(solutions[i][0] ?? '')
            : String(solutions[i] ?? '')
          answer[variables[i]] = fromNerdResult(raw, reverseVarMap, reverseParamMap)
        }
      } else {
        const parts = String(solutions).split(',')
        for (let i = 0; i + 1 < parts.length; i += 2) {
          const nv = parts[i].trim()
          const val = parts[i + 1].trim()
          const display = reverseVarMap.get(nv)
          if (display) answer[display] = fromNerdResult(val, reverseVarMap, reverseParamMap)
        }
      }
    }

    return { status: 'ok', variables, answer, initialMatrix }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { status: 'parse_error', variables, answer: {}, errorMessage: msg }
  }
}
