import { describe, it, expect } from 'vitest'
import { solveSymbolic } from '../src/solver/symbolic'
import type { EquationRow } from '../src/types'

function makeRow(rawText: string, segments: Array<{ type: string; value: string; sub?: string; sup?: string }>): EquationRow {
  return {
    id: '1',
    rawText,
    segments: segments.map((s, i) => ({
      type: s.type as any,
      value: s.value,
      sub: s.sub ?? '',
      sup: s.sup ?? '',
      id: `s${i}`,
    })),
  }
}

describe('solveSymbolic', () => {
  it('solves system with one symbolic parameter', () => {
    // (k)*x = 6  →  x = 6/k
    const rows: EquationRow[] = [
      makeRow('(k)x = 6', [
        { type: 'parameter', value: '(k)' },
        { type: 'variable', value: 'x' },
        { type: 'equals', value: '=' },
        { type: 'number', value: '6' },
      ]),
    ]
    const result = solveSymbolic(rows, ['x'])
    expect(result.status).toBe('ok')
    expect(result.answer['x']).toContain('k')
  })

  it('returns parse_error when no equations', () => {
    const result = solveSymbolic([], ['x'])
    expect(result.status).toBe('parse_error')
  })
})
