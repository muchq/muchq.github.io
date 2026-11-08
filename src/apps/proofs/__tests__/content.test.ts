import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { ALL_PROBLEMS, UNITS, problemBySlug, problemSlug } from '../content'
import { MACROS, parseBlocks, parseInline } from '../parse'
import type { Problem, Unit } from '../types'

// Every string a student will see, with where it came from.
function texts(unit: Unit): { where: string; text: string }[] {
  const out = [
    { where: `${unit.id}.why`, text: unit.why },
    ...unit.definitions.flatMap(d => [
      { where: `${unit.id}: ${d.term}`, text: d.term },
      { where: `${unit.id}: ${d.term}`, text: d.body },
    ]),
  ]
  for (const p of unit.problems) {
    const at = (field: string) => `${p.id}.${field}`
    out.push({ where: at('title'), text: p.title }, { where: at('statement'), text: p.statement })
    out.push({ where: at('solution'), text: p.solution })
    p.hints.forEach((h, i) => out.push({ where: at(`hints[${i}]`), text: h }))
    p.checks.forEach((c, i) => out.push({ where: at(`checks[${i}]`), text: c }))
    p.lines?.forEach((l, i) => out.push({ where: at(`lines[${i}]`), text: l }))
  }
  return out
}

const allTexts = UNITS.flatMap(texts)

// The TeX of a string exactly as the renderer will see it: display blocks and
// inline segments both.
function texOf(text: string): string[] {
  const out: string[] = []
  for (const block of parseBlocks(text)) {
    if (block.kind === 'math') out.push(block.tex)
    const lines = block.kind === 'p' ? [block.text] : block.kind === 'math' ? [] : block.items
    for (const line of lines) for (const piece of parseInline(line)) if (piece.kind === 'math') out.push(piece.text)
  }
  return out
}

describe('the curriculum', () => {
  it('numbers its units 0, 1, 2, … with unique slugs', () => {
    expect(UNITS.map(u => u.n)).toEqual(UNITS.map((_, i) => i))
    expect(new Set(UNITS.map(u => u.id)).size).toBe(UNITS.length)
  })

  it('gives every problem a unique id of the form "unit.n", numbered in order', () => {
    for (const unit of UNITS) {
      unit.problems.forEach((p, i) => expect(p.id).toBe(`${unit.n}.${i + 1}`))
    }
    expect(new Set(ALL_PROBLEMS.map(e => e.problem.id)).size).toBe(ALL_PROBLEMS.length)
  })

  it('only recommends earlier units as prerequisites', () => {
    for (const unit of UNITS) for (const n of unit.prereqs) expect(n).toBeLessThan(unit.n)
  })

  // "after Unit 9" on the page is advice a student acts on; it must lead to
  // everything the unit's problems use.
  it('recommends, through prerequisites, every earlier unit a problem cites', () => {
    const byN = new Map(UNITS.map(u => [u.n, u]))
    const reach = (n: number, seen = new Set<number>()): Set<number> => {
      for (const p of byN.get(n)!.prereqs) if (!seen.has(p)) reach(p, seen.add(p))
      return seen
    }
    const missing: string[] = []
    for (const unit of UNITS) {
      const ok = reach(unit.n)
      for (const p of unit.problems) {
        const prose = [p.statement, p.solution, ...p.hints, ...p.checks, ...(p.lines ?? [])]
          .join(' ')
          .replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$/g, '')
        const cited = [...(p.uses ?? []), ...[...prose.matchAll(/\b(\d{1,2})\.\d{1,2}\b/g)].map(m => m[0])]
        for (const id of cited) {
          const n = Number(id.split('.')[0])
          if (n < unit.n && !ok.has(n)) missing.push(`${p.id} cites ${id}, but Unit ${n} is not a prerequisite of Unit ${unit.n}`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('only lets a problem cite problems that come before it', () => {
    const order = new Map(ALL_PROBLEMS.map((e, i) => [e.problem.id, i]))
    for (const [i, { problem }] of ALL_PROBLEMS.entries()) {
      for (const used of problem.uses ?? []) {
        expect(order.has(used), `${problem.id} uses unknown ${used}`).toBe(true)
        expect(order.get(used)!, `${problem.id} uses later ${used}`).toBeLessThan(i)
      }
    }
  })

  it('points only at problems that exist when prose cites one by number', () => {
    const ids = new Set(ALL_PROBLEMS.map(e => e.problem.id))
    for (const { where, text } of allTexts) {
      // Outside TeX, "3.5" or "11.2" is a problem reference.
      const prose = text.replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$/g, '')
      for (const m of prose.matchAll(/\b(\d{1,2}\.\d{1,2})\b/g)) {
        expect(ids.has(m[1]), `${where} cites ${m[1]}`).toBe(true)
      }
    }
  })

  it('gives every problem hints, checks and a reference proof', () => {
    for (const { problem: p } of ALL_PROBLEMS) {
      expect(p.hints.length, p.id).toBeGreaterThanOrEqual(1)
      expect(p.hints.length, p.id).toBeLessThanOrEqual(4)
      expect(p.checks.length, p.id).toBeGreaterThanOrEqual(1)
      expect(p.solution.length, p.id).toBeGreaterThan(40)
    }
  })

  it('gives every prove-or-disprove a verdict, and only those', () => {
    for (const { problem: p } of ALL_PROBLEMS) {
      expect(typeof p.verdict === 'boolean', p.id).toBe(p.kind === 'decide')
    }
  })

  it('opens each prove-or-disprove solution with its verdict', () => {
    const decides = ALL_PROBLEMS.map(e => e.problem).filter(p => p.kind === 'decide')
    for (const p of decides) expect(p.solution.startsWith(p.verdict ? '**True' : '**False'), p.id).toBe(true)
  })

  // A student who learns that "prove or disprove" means "false" has stopped
  // thinking. Keep both answers common.
  it('keeps true and false verdicts both plentiful', () => {
    const decides = ALL_PROBLEMS.map(e => e.problem).filter(p => p.kind === 'decide')
    const trues = decides.filter(p => p.verdict).length
    expect(decides.length).toBeGreaterThanOrEqual(15)
    expect(trues / decides.length).toBeGreaterThan(0.35)
    expect(trues / decides.length).toBeLessThan(0.65)
  })

  it('gives every find-the-flaw a numbered argument and a flaw inside it, not at its conclusion', () => {
    for (const { problem: p } of ALL_PROBLEMS) {
      if (p.kind !== 'flaw') {
        expect(p.lines, p.id).toBeUndefined()
        expect(p.flawLine, p.id).toBeUndefined()
        continue
      }
      expect(p.lines!.length, p.id).toBeGreaterThanOrEqual(3)
      expect(Number.isInteger(p.flawLine), p.id).toBe(true)
      expect(p.flawLine!, p.id).toBeGreaterThanOrEqual(1)
      expect(p.flawLine!, p.id).toBeLessThan(p.lines!.length)
      expect(p.solution.startsWith(`**Line ${p.flawLine}`), p.id).toBe(true)
    }
  })

  it('mixes the three kinds of problem in every unit after the first', () => {
    for (const unit of UNITS) {
      const kinds = new Set(unit.problems.map((p: Problem) => p.kind))
      expect(kinds.has('prove'), unit.id).toBe(true)
      expect(kinds.has('decide') || kinds.has('flaw'), unit.id).toBe(true)
    }
    const flaws = ALL_PROBLEMS.filter(e => e.problem.kind === 'flaw')
    expect(new Set(flaws.map(e => e.unit.id)).size).toBeGreaterThanOrEqual(10)
  })

  it('renders every piece of TeX without a KaTeX error', () => {
    const failures: string[] = []
    for (const { where, text } of allTexts) {
      for (const tex of texOf(text)) {
        try {
          katex.renderToString(tex, { throwOnError: true, strict: 'error', macros: { ...MACROS } })
        } catch (e) {
          failures.push(`${where}: ${tex} — ${(e as Error).message}`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('leaves no stray dollar signs, i.e. no unclosed math', () => {
    for (const { where, text } of allTexts) {
      for (const block of parseBlocks(text)) {
        const lines = block.kind === 'p' ? [block.text] : block.kind === 'math' ? [] : block.items
        for (const line of lines) {
          for (const piece of parseInline(line)) {
            if (piece.kind === 'text') expect(piece.text.includes('$'), `${where}: ${piece.text}`).toBe(false)
          }
        }
      }
    }
  })

  it('leaves no unbalanced emphasis', () => {
    for (const { where, text } of allTexts) {
      for (const block of parseBlocks(text)) {
        const lines = block.kind === 'p' ? [block.text] : block.kind === 'math' ? [] : block.items
        for (const line of lines) {
          // A trailing space is plain text in whatever emphasis is still open.
          const end = parseInline(line + ' ').at(-1)!
          expect(end.strong || end.em, `${where}: ${line}`).toBe(false)
        }
      }
    }
  })

  it('ends with a mixed unit that signposts nothing: no definitions, no cited results', () => {
    const mixed = UNITS.filter(u => u.track === 'Mixed')
    expect(mixed).toHaveLength(1)
    expect(UNITS.at(-1)).toBe(mixed[0])
    expect(mixed[0].definitions).toEqual([])
    for (const p of mixed[0].problems) expect(p.uses ?? [], p.id).toEqual([])
  })

  it('routes every problem by a slug that finds it again', () => {
    for (const unit of UNITS) for (const p of unit.problems) expect(problemBySlug(unit, problemSlug(p.id))).toBe(p)
  })
})
