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

  it('solves 2x2 system with symbolic parameters', () => {
    // (k)x + y = 5
    // x + y = 3
    // → x = (5-3)/(k-1) = 2/(k-1),  y = 3 - x = (3k-5)/(k-1)
    const rows: EquationRow[] = [
      {
        id: '1', rawText: '(k)x + y = 5',
        segments: [
          { type: 'parameter', value: '(k)', sub: '', sup: '', id: 'p1' },
          { type: 'variable',  value: 'x',   sub: '', sup: '', id: 'v1' },
          { type: 'whitespace', value: ' ', sub: '', sup: '', id: 'w1' },
          { type: 'operator',  value: '+',   sub: '', sup: '', id: 'o1' },
          { type: 'whitespace', value: ' ', sub: '', sup: '', id: 'w2' },
          { type: 'variable',  value: 'y',   sub: '', sup: '', id: 'v2' },
          { type: 'whitespace', value: ' ', sub: '', sup: '', id: 'w3' },
          { type: 'equals',    value: '=',   sub: '', sup: '', id: 'e1' },
          { type: 'whitespace', value: ' ', sub: '', sup: '', id: 'w4' },
          { type: 'number',    value: '5',   sub: '', sup: '', id: 'n1' },
        ],
      },
      {
        id: '2', rawText: 'x + y = 3',
        segments: [
          { type: 'variable',  value: 'x',   sub: '', sup: '', id: 'v3' },
          { type: 'whitespace', value: ' ', sub: '', sup: '', id: 'w5' },
          { type: 'operator',  value: '+',   sub: '', sup: '', id: 'o2' },
          { type: 'whitespace', value: ' ', sub: '', sup: '', id: 'w6' },
          { type: 'variable',  value: 'y',   sub: '', sup: '', id: 'v4' },
          { type: 'whitespace', value: ' ', sub: '', sup: '', id: 'w7' },
          { type: 'equals',    value: '=',   sub: '', sup: '', id: 'e2' },
          { type: 'whitespace', value: ' ', sub: '', sup: '', id: 'w8' },
          { type: 'number',    value: '3',   sub: '', sup: '', id: 'n2' },
        ],
      },
    ]
    const result = solveSymbolic(rows, ['x', 'y'])
    expect(result.status).toBe('ok')
    // Answers must contain 'k' (parameter), not just variable names
    expect(result.answer['x']).not.toBe('x')
    expect(result.answer['y']).not.toBe('y')
    expect(result.answer['x']).toContain('k')
  })

  it('includes initialMatrix in symbolic result', () => {
    const rows: EquationRow[] = [
      makeRow('(k)x = 6', [
        { type: 'parameter', value: '(k)' },
        { type: 'variable', value: 'x' },
        { type: 'equals', value: '=' },
        { type: 'number', value: '6' },
      ]),
    ]
    const result = solveSymbolic(rows, ['x'])
    expect(result.initialMatrix).toBeDefined()
    expect(result.initialMatrix![0][0]).toBe('k')   // coefficient of x
    expect(result.initialMatrix![0][1]).toBe('6')   // RHS
  })

  it('returns parse_error when no equations', () => {
    const result = solveSymbolic([], ['x'])
    expect(result.status).toBe('parse_error')
  })
})
