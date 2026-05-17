import { Segment, SegmentType } from '../types'

// Unicode letter: latin + greek (U+0370–U+03FF) + extended
const LETTER = /[a-zA-ZͰ-Ͽἀ-῿]/
const LETTER_OR_DIGIT = /[a-zA-ZͰ-Ͽἀ-῿0-9_]/

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function tokenize(input: string): Segment[] {
  const segments: Segment[] = []
  let i = 0

  while (i < input.length) {
    const ch = input[i]

    // Whitespace
    if (/\s/.test(ch)) {
      let j = i
      while (j < input.length && /\s/.test(input[j])) j++
      segments.push({ type: 'whitespace', value: input.slice(i, j), id: makeId(), sub: '', sup: '' })
      i = j
      continue
    }

    // Parameter: (...) with nested paren support
    if (ch === '(') {
      let j = i + 1, depth = 1
      while (j < input.length && depth > 0) {
        if (input[j] === '(') depth++
        if (input[j] === ')') depth--
        j++
      }
      segments.push({ type: 'parameter', value: input.slice(i, j), id: makeId(), sub: '', sup: '' })
      i = j
      continue
    }

    // Number: digits + optional decimal point
    if (/[0-9]/.test(ch)) {
      let j = i
      while (j < input.length && /[0-9.]/.test(input[j])) j++
      segments.push({ type: 'number', value: input.slice(i, j), id: makeId(), sub: '', sup: '' })
      i = j
      continue
    }

    // Variable: starts with a unicode letter
    if (LETTER.test(ch)) {
      let j = i
      while (j < input.length && LETTER_OR_DIGIT.test(input[j])) j++
      segments.push({ type: 'variable', value: input.slice(i, j), id: makeId(), sub: '', sup: '' })
      i = j
      continue
    }

    // Equals
    if (ch === '=') {
      segments.push({ type: 'equals', value: '=', id: makeId(), sub: '', sup: '' })
      i++
      continue
    }

    // Operators
    if (/[+\-*/]/.test(ch)) {
      segments.push({ type: 'operator', value: ch, id: makeId(), sub: '', sup: '' })
      i++
      continue
    }

    // Unknown
    segments.push({ type: 'unknown', value: ch, id: makeId(), sub: '', sup: '' })
    i++
  }

  return segments
}

// Merge fresh tokens with stored tokens to preserve sub/sup indices.
// Matches by type+value in occurrence order.
export function mergeIndices(fresh: Segment[], stored: Segment[]): Segment[] {
  const occurrenceMap = new Map<string, Array<{ id: string; sub: string; sup: string }>>()
  for (const seg of stored) {
    if (seg.type !== 'variable' && seg.type !== 'parameter') continue
    const key = `${seg.type}:${seg.value}`
    if (!occurrenceMap.has(key)) occurrenceMap.set(key, [])
    occurrenceMap.get(key)!.push({ id: seg.id, sub: seg.sub, sup: seg.sup })
  }

  const usedCount = new Map<string, number>()

  return fresh.map(seg => {
    if (seg.type !== 'variable' && seg.type !== 'parameter') return seg
    const key = `${seg.type}:${seg.value}`
    const count = usedCount.get(key) ?? 0
    usedCount.set(key, count + 1)
    const storedList = occurrenceMap.get(key)
    if (storedList && storedList[count]) {
      const s = storedList[count]
      return { ...seg, id: s.id, sub: s.sub, sup: s.sup }
    }
    return seg
  })
}
