import React from 'react'

const SUB_MAP: Record<string, string> = {
  '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9',
}
const SUP_MAP: Record<string, string> = {
  '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9',
}

/** Render a display-name string like "x₁₂" with HTML sub/sup tags. */
export function renderVarDisplay(name: string): React.ReactNode {
  const nodes: React.ReactNode[] = []
  let text = ''
  let i = 0
  while (i < name.length) {
    const ch = name[i]
    if (ch in SUB_MAP) {
      if (text) { nodes.push(text); text = '' }
      let d = ''
      while (i < name.length && name[i] in SUB_MAP) { d += SUB_MAP[name[i]]; i++ }
      nodes.push(<sub key={nodes.length} style={{ fontSize: '0.62em', lineHeight: 0 }}>{d}</sub>)
    } else if (ch in SUP_MAP) {
      if (text) { nodes.push(text); text = '' }
      let d = ''
      while (i < name.length && name[i] in SUP_MAP) { d += SUP_MAP[name[i]]; i++ }
      nodes.push(<sup key={nodes.length} style={{ fontSize: '0.62em', lineHeight: 0 }}>{d}</sup>)
    } else {
      text += ch; i++
    }
  }
  if (text) nodes.push(text)
  return <>{nodes}</>
}

function topLevelSlash(s: string): number {
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++
    else if (s[i] === ')') depth--
    else if (s[i] === '/' && depth === 0) return i
  }
  return -1
}

function topLevelCaret(s: string): number {
  let depth = 0
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === ')') depth++
    else if (s[i] === '(') depth--
    else if (s[i] === '^' && depth === 0) return i
  }
  return -1
}

function stripOuterParens(s: string): string {
  const t = s.trim()
  if (!t.startsWith('(') || !t.endsWith(')')) return t
  let depth = 0
  for (let i = 0; i < t.length - 1; i++) {
    if (t[i] === '(') depth++
    else if (t[i] === ')') depth--
    if (depth === 0) return t
  }
  return t.slice(1, -1)
}

function removeMul(s: string): string {
  let r = s
  r = r.replace(/([a-zA-Z0-9₀-₉⁰-⁹])\*([a-zA-Z0-9₀-₉⁰-⁹(])/g, '$1$2')
  r = r.replace(/\)\*([a-zA-Z0-9₀-₉⁰-⁹(])/g, ')$1')
  return r
}

/** Render a math expression string with proper fractions and superscripts. */
export function renderMathExpr(expr: string): React.ReactNode {
  const s = removeMul(expr.trim())

  const slash = topLevelSlash(s)
  if (slash !== -1) {
    const num = stripOuterParens(s.slice(0, slash).trim())
    const den = stripOuterParens(s.slice(slash + 1).trim())
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', verticalAlign: 'middle', margin: '0 2px', lineHeight: 1.3 }}>
        <span style={{ borderBottom: '1px solid currentColor', paddingBottom: 1, paddingLeft: 2, paddingRight: 2 }}>
          {renderMathExpr(num)}
        </span>
        <span style={{ paddingLeft: 2, paddingRight: 2 }}>
          {renderMathExpr(den)}
        </span>
      </span>
    )
  }

  const caret = topLevelCaret(s)
  if (caret !== -1) {
    const base = s.slice(0, caret)
    const expRaw = s.slice(caret + 1).trim()
    const exp = expRaw.startsWith('(') && expRaw.endsWith(')') ? expRaw.slice(1, -1) : expRaw
    return (
      <span>
        {renderMathExpr(base)}
        <sup style={{ fontSize: '0.72em' }}>{renderMathExpr(exp)}</sup>
      </span>
    )
  }

  // Recurse into outer parens preserving them visually
  if (s.startsWith('(') && s.endsWith(')')) {
    const inner = stripOuterParens(s)
    if (inner !== s) {
      return <>({renderMathExpr(inner)})</>
    }
  }

  return <>{s}</>
}
