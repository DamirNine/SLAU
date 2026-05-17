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

type MirrorMap = Map<string, { canonical: string; sign: number }>

function buildNerdEq(
  row: EquationRow,
  varMap: Map<string, string>,
  paramMap: Map<string, string>,
  mirrorMap: MirrorMap
): string {
  const segs = row.segments.filter(s => s.type !== 'whitespace')
  let lhs = '', rhs = '', side: 'lhs' | 'rhs' = 'lhs'
  let prevType = ''

  const append = (s: string) => { if (side === 'lhs') lhs += s; else rhs += s }

  for (const seg of segs) {
    if (seg.type === 'equals') { side = 'rhs'; prevType = ''; continue }
    const needsMul = ((prevType === 'parameter' || prevType === 'number') &&
                      (seg.type === 'variable' || seg.type === 'parameter')) ||
                     (prevType === 'variable' && seg.type === 'parameter')
    if (needsMul) append('*')
    if (seg.type === 'operator' || seg.type === 'number') {
      append(seg.value)
    } else if (seg.type === 'variable') {
      const dn = displayName(seg)
      const mirror = mirrorMap.get(dn)
      if (mirror) {
        // x₂₁ → (-vv_canonical): negated canonical variable
        append(`(-${varMap.get(mirror.canonical) ?? mirror.canonical})`)
      } else {
        append(varMap.get(dn) ?? dn)
      }
    } else if (seg.type === 'parameter') {
      append(paramMap.get(seg.value) ?? seg.value.slice(1, -1))
    }
    prevType = seg.type
  }
  return `${lhs}=${rhs}`
}

function negExpToFraction(s: string): string {
  let r = s
  for (let i = 0; i < 6; i++) {
    const prev = r
    // (A)^(-1)*(B) → (B)/(A)
    r = r.replace(/\(([^()]+)\)\^\(-1\)\*\(([^()]+)\)/g, '($2)/($1)')
    // (A)^(-1)*term → term/(A)
    r = r.replace(/\(([^()]+)\)\^\(-1\)\*([a-zA-Z0-9]+)/g, '$2/($1)')
    // term*(A)^(-1) → term/(A)
    r = r.replace(/([a-zA-Z0-9]+)\*\(([^()]+)\)\^\(-1\)/g, '$1/($2)')
    // (A)*(B)^(-1) → (A)/(B)
    r = r.replace(/\(([^()]+)\)\*\(([^()]+)\)\^\(-1\)/g, '($1)/($2)')
    // term^(-1)*term2 → term2/term
    r = r.replace(/([a-zA-Z0-9]+)\^\(-1\)\*([a-zA-Z0-9]+)/g, '$2/$1')
    // (A)^(-1) alone → 1/(A)
    r = r.replace(/\(([^()]+)\)\^\(-1\)/g, '1/($1)')
    // term^(-1) alone → 1/term
    r = r.replace(/([a-zA-Z0-9]+)\^\(-1\)/g, '1/$1')
    if (r === prev) break
  }
  return r
}

function simplifyRaw(raw: string, nerd: any): string {
  let s = raw
  try {
    s = String(nerd.simplify(raw).text('fractions'))
  } catch {
    try {
      s = String(nerd(raw).text('fractions'))
    } catch { /* fall through */ }
  }
  return negExpToFraction(s)
}

function fromNerdResult(
  result: string,
  reverseVarMap: Map<string, string>,
  reverseParamMap: Map<string, string>,
  nerdInstance: any
): string {
  let s = simplifyRaw(result, nerdInstance)
  const varEntries = [...reverseVarMap.entries()].sort((a, b) => b[0].length - a[0].length)
  for (const [nv, display] of varEntries) s = s.replaceAll(nv, display)
  for (const [np, display] of reverseParamMap.entries()) s = s.replaceAll(np, display)
  // Remove explicit * between adjacent terms (standard math notation)
  s = s.replace(/([a-zA-Z0-9₀-₉⁰-⁹])\*([a-zA-Z0-9₀-₉⁰-⁹(])/g, '$1$2')
  s = s.replace(/\)\*([a-zA-Z0-9₀-₉⁰-⁹(])/g, ')$1')
  return s
}

// Build augmented matrix with symbolic coefficients for display
export function buildSymbolicMatrix(rows: EquationRow[], variables: string[], mirrorMap: MirrorMap = new Map()): string[][] {
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
          const varOrParamFollows = next?.type === 'variable' || afterStar?.type === 'variable'
            || next?.type === 'parameter' || afterStar?.type === 'parameter'
          if (!varOrParamFollows) {
            const val = String(pendingNum)
            if (onRhs) rhsParts.push(val)
            else rhsParts.push(String(-pendingNum))
            pendingNum = null; sign = 1
          }
          continue
        }

        if (seg.type === 'parameter') {
          const content = seg.value.slice(1, -1).trim()
          if (pendingNum !== null) {
            // 3(K) pattern: number already stored in pendingNum with sign
            // just set the param name; variable handler will combine as "${pendingNum}${content}"
            pendingParam = content
          } else {
            pendingParam = sign < 0 ? `-${content}` : content
          }
          sign = 1
          const next = segs[i + 1]
          const afterStar = next?.value === '*' ? segs[i + 2] : null
          let varFollows = next?.type === 'variable' || afterStar?.type === 'variable'
          // (K)3x: parameter followed by number then variable
          if (!varFollows && next?.type === 'number') {
            const afterNum = segs[i + 2]
            if (afterNum?.type === 'variable') {
              const numVal = parseFloat(next.value)
              const paramNeg = pendingParam!.startsWith('-')
              const baseName = paramNeg ? pendingParam!.slice(1) : pendingParam!
              pendingNum = paramNeg ? -numVal : numVal
              pendingParam = baseName
              i++
              varFollows = true
            }
          }
          if (!varFollows) {
            let standalone: string
            if (pendingNum !== null) {
              const n = pendingNum
              const pNeg = pendingParam!.startsWith('-')
              const base = pNeg ? pendingParam!.slice(1) : pendingParam!
              const total = pNeg ? -n : n
              standalone = total === 1 ? base : total === -1 ? `-${base}` : `${total}${base}`
              pendingNum = null
            } else {
              standalone = pendingParam!
            }
            if (onRhs) rhsParts.push(standalone)
            else {
              const neg = standalone.startsWith('-') ? standalone.slice(1) : `-${standalone}`
              rhsParts.push(neg)
            }
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
            // y(K) pattern: no pending coeff but next segment is a parameter
            const next = segs[i + 1]
            if (next?.type === 'parameter') {
              const content = next.value.slice(1, -1).trim()
              coeff = sign < 0 ? `-${content}` : content
              i++ // consume the parameter token
            } else {
              coeff = sign > 0 ? '1' : '-1'
            }
          }
          pendingNum = null; pendingParam = null; sign = 1

          const mirror = mirrorMap.get(dn)
          const target = mirror ? mirror.canonical : dn
          // Mirrored variable: flip coefficient sign
          const effCoeff = mirror
            ? (coeff.startsWith('-') ? coeff.slice(1) : `-${coeff}`)
            : coeff

          if (variables.includes(target)) {
            if (onRhs) {
              const negated = effCoeff.startsWith('-') ? effCoeff.slice(1) : `-${effCoeff}`
              coeffParts[target].push(negated)
            } else {
              coeffParts[target].push(effCoeff)
            }
          }
          continue
        }
      }

      const combineLinearParts = (parts: string[]): string => {
        if (parts.length === 0) return '0'
        const grouped = new Map<string, number>()
        for (const p of parts) {
          if (!isNaN(Number(p))) {
            grouped.set('', (grouped.get('') ?? 0) + Number(p))
            continue
          }
          const m = p.match(/^(-?)([0-9]*\.?[0-9]*)([a-zA-Z]\w*)$/)
          if (m) {
            const s = m[1] === '-' ? -1 : 1
            const n = m[2] === '' ? 1 : Number(m[2])
            const param = m[3]
            grouped.set(param, (grouped.get(param) ?? 0) + s * n)
          } else {
            let r = parts[0]
            for (let j = 1; j < parts.length; j++) r += parts[j].startsWith('-') ? parts[j] : `+${parts[j]}`
            return r
          }
        }
        const out: string[] = []
        for (const k of [...grouped.keys()].filter(k => k !== '').sort()) {
          const c = grouped.get(k)!
          if (c === 0) continue
          out.push(c === 1 ? k : c === -1 ? `-${k}` : `${c}${k}`)
        }
        const cv = grouped.get('') ?? 0
        if (cv !== 0) out.push(String(cv))
        if (out.length === 0) return '0'
        let r = out[0]
        for (let i = 1; i < out.length; i++) r += out[i].startsWith('-') ? out[i] : `+${out[i]}`
        return r
      }

      return [...variables.map(v => combineLinearParts(coeffParts[v])), combineLinearParts(rhsParts)]
    })
}

export function solveSymbolic(rows: EquationRow[], variables: string[], mirrorMap: MirrorMap = new Map()): SolveResult {
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
    .map(row => buildNerdEq(row, varMap, paramMap, mirrorMap))

  if (eqStrings.length === 0) {
    return { status: 'parse_error', variables, answer: {}, errorMessage: 'Нет уравнений для решения.' }
  }

  const initialMatrix = buildSymbolicMatrix(rows, variables, mirrorMap)
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
      answer[variables[0]] = fromNerdResult(raw.trim(), reverseVarMap, reverseParamMap, nerd)
    } else {
      const solutions = nerd.solveEquations(eqStrings, nerdVars)
      if (Array.isArray(solutions)) {
        if (solutions.length > 0 && Array.isArray(solutions[0])) {
          // Format: [[varName, value], ...] — match by variable name, not index
          for (const pair of solutions) {
            const nv = String((pair as [unknown, unknown])[0])
            const val = String((pair as [unknown, unknown])[1] ?? '')
            const display = reverseVarMap.get(nv)
            if (display) answer[display] = fromNerdResult(val, reverseVarMap, reverseParamMap, nerd)
          }
        } else {
          // Format: [value0, value1, ...] — indexed by variable order
          for (let i = 0; i < variables.length && i < solutions.length; i++) {
            answer[variables[i]] = fromNerdResult(String(solutions[i]), reverseVarMap, reverseParamMap, nerd)
          }
        }
      } else {
        const parts = String(solutions).split(',')
        for (let i = 0; i + 1 < parts.length; i += 2) {
          const nv = parts[i].trim()
          const val = parts[i + 1].trim()
          const display = reverseVarMap.get(nv)
          if (display) answer[display] = fromNerdResult(val, reverseVarMap, reverseParamMap, nerd)
        }
      }
    }

    return { status: 'ok', variables, answer, initialMatrix }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { status: 'parse_error', variables, answer: {}, errorMessage: msg }
  }
}
