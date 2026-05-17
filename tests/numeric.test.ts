import { describe, it, expect } from 'vitest'
import { solveNumeric } from '../src/solver/numeric'
import type { LinearEquation } from '../src/parser/normalizer'

describe('solveNumeric', () => {
  it('solves 2x2 system', () => {
    const equations: LinearEquation[] = [
      { coefficients: { x: 1, y: 1 }, rhs: 3 },
      { coefficients: { x: 2, y: -1 }, rhs: 0 },
    ]
    const result = solveNumeric(equations, ['x', 'y'])
    expect(result.status).toBe('ok')
    expect(result.answer['x']).toBe('1')
    expect(result.answer['y']).toBe('2')
  })

  it('detects inconsistent system', () => {
    const equations: LinearEquation[] = [
      { coefficients: { x: 1 }, rhs: 1 },
      { coefficients: { x: 1 }, rhs: 2 },
    ]
    const result = solveNumeric(equations, ['x'])
    expect(result.status).toBe('inconsistent')
  })

  it('detects underdetermined system', () => {
    const equations: LinearEquation[] = [
      { coefficients: { x: 1, y: 1 }, rhs: 3 },
    ]
    const result = solveNumeric(equations, ['x', 'y'])
    expect(result.status).toBe('underdetermined')
  })

  it('returns Gauss steps', () => {
    const equations: LinearEquation[] = [
      { coefficients: { x: 2, y: 1 }, rhs: 5 },
      { coefficients: { x: 4, y: 3 }, rhs: 11 },
    ]
    const result = solveNumeric(equations, ['x', 'y'])
    expect(result.status).toBe('ok')
    expect(result.steps!.length).toBeGreaterThan(0)
    expect(result.initialMatrix).toBeTruthy()
  })

  it('handles fractions correctly', () => {
    const equations: LinearEquation[] = [
      { coefficients: { x: 3, y: 2 }, rhs: 7 },
      { coefficients: { x: 1, y: -1 }, rhs: 1 },
    ]
    const result = solveNumeric(equations, ['x', 'y'])
    expect(result.status).toBe('ok')
    expect(result.answer['x']).toBe('9/5')
    expect(result.answer['y']).toBe('4/5')
  })

  it('rejects more than 20 variables', () => {
    const variables = Array.from({ length: 21 }, (_, i) => `x${i}`)
    const equations = [{ coefficients: Object.fromEntries(variables.map(v => [v, 1])), rhs: 1 }]
    const result = solveNumeric(equations, variables)
    expect(result.status).toBe('too_many_vars')
  })
})
