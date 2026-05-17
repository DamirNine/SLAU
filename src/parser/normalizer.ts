import type { EquationRow } from '../types'

function toSubscript(s: string): string {
  const map: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  }
  return s.split('').map(c => map[c] ?? c).join('')
}

function toSuperscript(s: string): string {
  const map: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  }
  return s.split('').map(c => map[c] ?? c).join('')
}

export function displayName(seg: { value?: string; name?: string; sub: string; sup: string }): string {
  let name = (seg.value ?? seg.name) ?? ''
  if (seg.sub) name += toSubscript(seg.sub)
  if (seg.sup) name += toSuperscript(seg.sup)
  return name
}

interface VarKey { name: string; sub: string; sup: string }

export function extractVariables(rows: EquationRow[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const row of rows) {
    for (const seg of row.segments) {
      if (seg.type !== 'variable') continue
      const dn = displayName(seg)
      if (!seen.has(dn)) { seen.add(dn); result.push(dn) }
    }
  }
  return result
}

export function detectMirroredPairs(
  vars: VarKey[]
): Array<{ canonical: VarKey; mirrored: VarKey }> {
  const pairs: Array<{ canonical: VarKey; mirrored: VarKey }> = []
  for (let i = 0; i < vars.length; i++) {
    for (let j = i + 1; j < vars.length; j++) {
      const a = vars[i], b = vars[j]
      if (a.name !== b.name || a.sup !== b.sup) continue
      if (a.sub.length < 2) continue // single digit: not a reversed pair
      if (a.sub === b.sub.split('').reverse().join('')) {
        if (a.sub < b.sub) pairs.push({ canonical: a, mirrored: b })
        else pairs.push({ canonical: b, mirrored: a })
      }
    }
  }
  return pairs
}

export interface LinearEquation {
  coefficients: Record<string, number>
  rhs: number
}

export function normalizeForSolver(rows: EquationRow[]): {
  equations: LinearEquation[]
  variables: string[]
  pairs: Array<{ canonical: string; mirrored: string }>
} {
  // Collect unique variable keys
  const varKeys: VarKey[] = []
  const varKeySeen = new Set<string>()
  for (const row of rows) {
    for (const seg of row.segments) {
      if (seg.type !== 'variable') continue
      const key = `${seg.value}|${seg.sub}|${seg.sup}`
      if (!varKeySeen.has(key)) {
        varKeySeen.add(key)
        varKeys.push({ name: seg.value, sub: seg.sub, sup: seg.sup })
      }
    }
  }

  const mirrorPairs = detectMirroredPairs(varKeys)
  const mirrorMap = new Map<string, { canonical: string; sign: number }>()
  for (const p of mirrorPairs) {
    mirrorMap.set(displayName(p.mirrored), { canonical: displayName(p.canonical), sign: -1 })
  }

  // Variables to solve for (canonical only, no mirrored)
  const allVarNames = varKeys.map(v => displayName(v))
  const variables = allVarNames.filter(v => !mirrorMap.has(v))

  const equations: LinearEquation[] = rows.map(row => parseRow(row, variables, mirrorMap))

  return {
    equations,
    variables,
    pairs: mirrorPairs.map(p => ({ canonical: displayName(p.canonical), mirrored: displayName(p.mirrored) })),
  }
}

function parseRow(
  row: EquationRow,
  variables: string[],
  mirrorMap: Map<string, { canonical: string; sign: number }>
): LinearEquation {
  const coefficients: Record<string, number> = {}
  for (const v of variables) coefficients[v] = 0

  const segs = row.segments.filter(s => s.type !== 'whitespace')
  let sign = 1
  let pendingCoeff: number | null = null
  let rhs = 0
  let onRhs = false

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]

    if (seg.type === 'equals') { onRhs = true; sign = 1; continue }

    if (seg.type === 'operator') {
      if (seg.value === '-') sign = -1
      else if (seg.value === '+') sign = 1
      pendingCoeff = null
      continue
    }

    if (seg.type === 'number') {
      pendingCoeff = parseFloat(seg.value) * sign
      // If next segment is not a variable, this number is standalone (rhs or coeff without var)
      const next = segs[i + 1]
      if (!next || next.type !== 'variable') {
        if (onRhs) rhs += pendingCoeff
        pendingCoeff = null
        sign = 1
      }
      continue
    }

    if (seg.type === 'variable') {
      const dn = displayName(seg)
      const coeff = pendingCoeff ?? sign
      if (onRhs) {
        rhs -= coeff
      } else {
        const mirror = mirrorMap.get(dn)
        const target = mirror ? mirror.canonical : dn
        const effectiveCoeff = mirror ? coeff * mirror.sign : coeff
        if (target in coefficients) coefficients[target] += effectiveCoeff
      }
      pendingCoeff = null
      sign = 1
      continue
    }
  }

  return { coefficients, rhs }
}
