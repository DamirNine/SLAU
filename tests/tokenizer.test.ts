import { describe, it, expect } from 'vitest'
import { tokenize } from '../src/parser/tokenizer'

describe('tokenize', () => {
  it('parses numbers', () => {
    const segs = tokenize('3')
    expect(segs[0].type).toBe('number')
    expect(segs[0].value).toBe('3')
  })

  it('parses latin variable', () => {
    const segs = tokenize('x')
    expect(segs[0].type).toBe('variable')
    expect(segs[0].value).toBe('x')
  })

  it('parses greek variable', () => {
    const segs = tokenize('ω')
    expect(segs[0].type).toBe('variable')
    expect(segs[0].value).toBe('ω')
  })

  it('parses parameter in parens', () => {
    const segs = tokenize('(X_m)')
    expect(segs[0].type).toBe('parameter')
    expect(segs[0].value).toBe('(X_m)')
  })

  it('parses parameter with expression', () => {
    const segs = tokenize('(k + b)')
    expect(segs[0].type).toBe('parameter')
  })

  it('parses full equation', () => {
    const segs = tokenize('3x + 2y = 7')
    const types = segs.filter(s => s.type !== 'whitespace').map(s => s.type)
    expect(types).toEqual(['number', 'variable', 'operator', 'number', 'variable', 'equals', 'number'])
  })

  it('assigns ids to all tokens', () => {
    const segs = tokenize('x + y = 1')
    expect(segs.every(s => s.id.length > 0)).toBe(true)
  })
})
