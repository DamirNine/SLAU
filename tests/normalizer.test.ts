import { describe, it, expect } from 'vitest'
import { extractVariables, detectMirroredPairs, normalizeForSolver } from '../src/parser/normalizer'
import { EquationRow } from '../src/types'

function makeRow(segments: Array<{ type: string; value: string; sub?: string; sup?: string }>): EquationRow {
  return {
    id: 'r1',
    rawText: '',
    segments: segments.map((s, i) => ({
      type: s.type as any,
      value: s.value,
      sub: s.sub ?? '',
      sup: s.sup ?? '',
      id: `seg_${i}`,
    })),
  }
}

describe('extractVariables', () => {
  it('returns unique variable display names', () => {
    const rows = [
      makeRow([
        { type: 'variable', value: 'x', sub: '12' },
        { type: 'variable', value: 'x', sub: '21' },
      ]),
    ]
    const vars = extractVariables(rows)
    expect(vars).toContain('x₁₂')
    expect(vars).toContain('x₂₁')
    expect(vars.length).toBe(2)
  })
})

describe('detectMirroredPairs', () => {
  it('detects x12/x21 as mirrored pair', () => {
    const vars = [
      { name: 'x', sub: '12', sup: '' },
      { name: 'x', sub: '21', sup: '' },
    ]
    const pairs = detectMirroredPairs(vars)
    expect(pairs.length).toBe(1)
    expect(pairs[0].canonical.sub).toBe('12')
    expect(pairs[0].mirrored.sub).toBe('21')
  })

  it('does not flag x1/x2 as mirrored', () => {
    const vars = [
      { name: 'x', sub: '1', sup: '' },
      { name: 'x', sub: '2', sup: '' },
    ]
    expect(detectMirroredPairs(vars)).toHaveLength(0)
  })
})

describe('normalizeForSolver', () => {
  it('folds mirrored variable coefficient with negation', () => {
    // 3x₁₂ + 2x₂₁ = 7  →  (3 + (-1)*2)x₁₂ = 7  →  x₁₂ coeff = 1
    const rows = [
      makeRow([
        { type: 'number', value: '3' },
        { type: 'variable', value: 'x', sub: '12' },
        { type: 'operator', value: '+' },
        { type: 'number', value: '2' },
        { type: 'variable', value: 'x', sub: '21' },
        { type: 'equals', value: '=' },
        { type: 'number', value: '7' },
      ]),
    ]
    const { equations, pairs } = normalizeForSolver(rows)
    expect(pairs.length).toBe(1)
    expect(equations[0].coefficients['x₁₂']).toBe(1)
    expect(equations[0].rhs).toBe(7)
  })
})
