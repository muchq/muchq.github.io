import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Markup from '../markup'
import { parseBlocks, parseInline } from '../parse'

describe('parseBlocks', () => {
  it('splits paragraphs on blank lines and joins wrapped lines', () => {
    expect(parseBlocks('one\ntwo\n\nthree')).toEqual([
      { kind: 'p', text: 'one two' },
      { kind: 'p', text: 'three' },
    ])
  })

  it('lifts display math out of the middle of a paragraph', () => {
    expect(parseBlocks('before\n$$x^2$$\nafter')).toEqual([
      { kind: 'p', text: 'before' },
      { kind: 'math', tex: 'x^2' },
      { kind: 'p', text: 'after' },
    ])
  })

  it('reads display math that spans lines', () => {
    expect(parseBlocks('$$\na +\nb\n$$')).toEqual([{ kind: 'math', tex: 'a +\nb' }])
  })

  it('treats an unclosed $$ as text', () => {
    expect(parseBlocks('$$x\ny')).toEqual([{ kind: 'p', text: '$$x y' }])
  })

  it('recognizes bullet and numbered lists, with indented continuation lines', () => {
    expect(parseBlocks('- a\n  more\n- b')).toEqual([{ kind: 'ul', items: ['a more', 'b'] }])
    expect(parseBlocks('1. a\n2. b')).toEqual([{ kind: 'ol', items: ['a', 'b'] }])
  })

  it('keeps a paragraph that merely starts like a list as a paragraph', () => {
    expect(parseBlocks('- a\nplain')).toEqual([{ kind: 'p', text: '- a plain' }])
  })
})

describe('parseInline', () => {
  it('separates math from text', () => {
    expect(parseInline('let $x \\in A$ be')).toEqual([
      { kind: 'text', text: 'let ', strong: false, em: false },
      { kind: 'math', text: 'x \\in A', strong: false, em: false },
      { kind: 'text', text: ' be', strong: false, em: false },
    ])
  })

  it('never reads asterisks inside math as emphasis', () => {
    const pieces = parseInline('$a * b$ and *c*')
    expect(pieces[0]).toEqual({ kind: 'math', text: 'a * b', strong: false, em: false })
    expect(pieces.find(p => p.text === 'c')).toMatchObject({ em: true })
  })

  it('carries emphasis across math', () => {
    const pieces = parseInline('**the set $A$ here**')
    expect(pieces.every(p => p.strong)).toBe(true)
    expect(pieces.map(p => p.kind)).toEqual(['text', 'math', 'text'])
  })

  it('reads \\$ as a literal dollar and an unclosed $ as text', () => {
    expect(parseInline('costs \\$5')).toEqual([{ kind: 'text', text: 'costs $5', strong: false, em: false }])
    expect(parseInline('a $b')).toEqual([{ kind: 'text', text: 'a $b', strong: false, em: false }])
  })
})

describe('Markup', () => {
  it('renders TeX through KaTeX', () => {
    const { container } = render(<Markup text={'If $x \\in \\R$ then\n$$\\sum_k k$$'} />)
    expect(container.querySelectorAll('.katex').length).toBe(2)
    expect(container.querySelector('.katex-display')).not.toBeNull()
  })

  // Students' own attempts go through this renderer.
  it('shows HTML in the source as text and never injects it', () => {
    const { container } = render(<Markup text={'<img src=x onerror="alert(1)"> **<b>bold</b>**'} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">')
    expect(container.querySelector('strong')?.textContent).toBe('<b>bold</b>')
  })

  it('shows broken TeX as an error mark instead of throwing', () => {
    const { container } = render(<Markup text={'$\\frac{$'} />)
    expect(container.querySelector('.katex-error')).not.toBeNull()
  })

  it('renders lists as lists', () => {
    const { container } = render(<Markup text={'1. one\n2. two'} />)
    expect(container.querySelectorAll('ol > li').length).toBe(2)
  })
})
