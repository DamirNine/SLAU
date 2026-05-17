import Fraction from 'fraction.js'
import type { LinearEquation } from '../parser/normalizer'
import type { GaussStep, SolveResult } from '../types'

type FMatrix = Fraction[][]

function cloneMatrix(m: FMatrix): string[][] {
  return m.map(row => row.map(f => f.toFraction()))
}

export function solveNumeric(equations: LinearEquation[], variables: string[]): SolveResult {
  const n = variables.length
  const m = equations.length

  if (n > 20) {
    return {
      status: 'too_many_vars',
      variables,
      answer: {},
      errorMessage: `Слишком много переменных: ${n} (максимум 20)`,
    }
  }

  if (m < n) {
    return {
      status: 'underdetermined',
      variables,
      answer: {},
      errorMessage: `Уравнений (${m}) меньше чем переменных (${n}). Система недоопределена.`,
    }
  }

  // Build augmented matrix [A|b]
  const mat: FMatrix = equations.map(eq =>
    [...variables.map(v => new Fraction(eq.coefficients[v] ?? 0)), new Fraction(eq.rhs)]
  )

  const initialMatrix = cloneMatrix(mat)
  const steps: GaussStep[] = []
  const cols = n + 1

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot row (max absolute value)
    let pivotRow = -1
    let maxVal = new Fraction(0)
    for (let row = col; row < m; row++) {
      const abs = mat[row][col].abs()
      if (abs.compare(maxVal) > 0) { maxVal = abs; pivotRow = row }
    }

    if (pivotRow === -1 || maxVal.equals(0)) continue

    if (pivotRow !== col) {
      ;[mat[col], mat[pivotRow]] = [mat[pivotRow], mat[col]]
      steps.push({ desc: `R${col + 1} ↔ R${pivotRow + 1}`, matrix: cloneMatrix(mat) })
    }

    for (let row = col + 1; row < m; row++) {
      if (mat[row][col].equals(0)) continue
      const factor = mat[row][col].div(mat[col][col])
      for (let j = 0; j < cols; j++) {
        mat[row][j] = mat[row][j].sub(factor.mul(mat[col][j]))
      }
      steps.push({
        desc: `R${row + 1} ← R${row + 1} − (${factor.toFraction()})·R${col + 1}`,
        matrix: cloneMatrix(mat),
      })
    }
  }

  // Check consistency: row [0…0 | c≠0] → inconsistent
  for (let row = n; row < m; row++) {
    const allZero = variables.every((_, j) => mat[row][j].equals(0))
    if (allZero && !mat[row][n].equals(0)) {
      return {
        status: 'inconsistent',
        variables,
        answer: {},
        initialMatrix,
        steps,
        errorMessage: 'Система несовместна — нет решений.',
      }
    }
  }

  // Back substitution
  const solution: Fraction[] = new Array(n).fill(new Fraction(0))
  const backLines: string[] = []

  for (let row = n - 1; row >= 0; row--) {
    if (mat[row][row].equals(0)) continue
    let val = mat[row][n]
    for (let j = row + 1; j < n; j++) {
      val = val.sub(mat[row][j].mul(solution[j]))
    }
    solution[row] = val.div(mat[row][row])
    backLines.unshift(`${variables[row]} = ${solution[row].toFraction()}`)
  }

  const answer: Record<string, string> = {}
  for (let i = 0; i < n; i++) {
    answer[variables[i]] = solution[i].toFraction()
  }

  return { status: 'ok', variables, answer, initialMatrix, steps, backSubstitution: backLines }
}
