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

  it('flattens grouped expression (with operators) into inner tokens', () => {
    const segs = tokenize('(k + b)')
    const nonWs = segs.filter(s => s.type !== 'whitespace')
    expect(nonWs[0].type).toBe('variable')
    expect(nonWs[0].value).toBe('k')
    expect(nonWs[1].type).toBe('operator')
    expect(nonWs[2].type).toBe('variable')
    expect(nonWs[2].value).toBe('b')
  })

  it('keeps simple identifier as parameter', () => {
    const segs = tokenize('(K)')
    expect(segs[0].type).toBe('parameter')
    expect(segs[0].value).toBe('(K)')
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
