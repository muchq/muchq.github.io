// The small markup the curriculum is written in, and that students may use in
// their own attempts: blank-line separated paragraphs, "- " and "1. " lists,
// **bold**, *italic*, $inline TeX$ and a $$display TeX$$ block. "\$" is a
// literal dollar. Nothing in the source is ever injected as HTML; the only
// markup that reaches innerHTML is KaTeX's own output.
import katex from 'katex'

export const MACROS: Record<string, string> = {
  '\\R': '\\mathbb{R}',
  '\\Z': '\\mathbb{Z}',
  '\\N': '\\mathbb{N}',
  '\\Q': '\\mathbb{Q}',
  '\\C': '\\mathbb{C}',
}

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'math'; tex: string }
  | { kind: 'ul' | 'ol'; items: string[] }

const BULLET = /^- /
const NUMBERED = /^\d+\. /

/** Lines of a list chunk grouped into items; indented lines continue an item. */
function listItems(lines: string[], marker: RegExp): string[] | null {
  const items: string[] = []
  for (const line of lines) {
    if (marker.test(line)) items.push(line.replace(marker, ''))
    else if (/^\s/.test(line) && items.length > 0) items[items.length - 1] += ' ' + line.trim()
    else return null
  }
  return items
}

/** A run of text lines: a list if every line belongs to one, else a paragraph. */
function textBlock(lines: string[]): Block {
  const ul = listItems(lines, BULLET)
  if (ul) return { kind: 'ul', items: ul }
  const ol = listItems(lines, NUMBERED)
  if (ol) return { kind: 'ol', items: ol }
  return { kind: 'p', text: lines.map(l => l.trim()).join(' ') }
}

/**
 * Blank lines separate blocks. A line opening with $$ starts display math,
 * which runs to the next line ending in $$ and may sit inside a paragraph —
 * the text either side becomes paragraphs of its own. An unclosed $$ is text.
 */
export function parseBlocks(src: string): Block[] {
  const blocks: Block[] = []
  for (const chunk of src.split(/\n[ \t]*\n/)) {
    const lines = chunk.split('\n').map(l => l.replace(/\s+$/, ''))
    let text: string[] = []
    const flush = () => {
      const kept = text.filter(l => l.trim())
      if (kept.length) blocks.push(textBlock(kept))
      text = []
    }
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim()
      if (t.startsWith('$$')) {
        let body = t.slice(2)
        let j = i
        while (!body.endsWith('$$') && j + 1 < lines.length) body += '\n' + lines[++j].trim()
        if (body.endsWith('$$')) {
          flush()
          blocks.push({ kind: 'math', tex: body.slice(0, -2).trim() })
          i = j
          continue
        }
      }
      text.push(lines[i])
    }
    flush()
  }
  return blocks
}

export interface Inline {
  kind: 'text' | 'math'
  text: string
  strong: boolean
  em: boolean
}

/** Math first, so asterisks inside TeX are never emphasis; then ** and * toggle. */
export function parseInline(src: string): Inline[] {
  const segments: { math: boolean; text: string }[] = []
  let buf = ''
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\' && src[i + 1] === '$') {
      buf += '$'
      i += 2
      continue
    }
    if (ch === '$') {
      let j = i + 1
      while (j < src.length && !(src[j] === '$' && src[j - 1] !== '\\')) j++
      if (j < src.length && j > i + 1) {
        if (buf) segments.push({ math: false, text: buf })
        buf = ''
        segments.push({ math: true, text: src.slice(i + 1, j) })
        i = j + 1
        continue
      }
    }
    buf += ch
    i++
  }
  if (buf) segments.push({ math: false, text: buf })

  const out: Inline[] = []
  let strong = false
  let em = false
  for (const seg of segments) {
    if (seg.math) {
      out.push({ kind: 'math', text: seg.text, strong, em })
      continue
    }
    for (const piece of seg.text.split(/(\*\*|\*)/)) {
      if (piece === '**') strong = !strong
      else if (piece === '*') em = !em
      else if (piece) out.push({ kind: 'text', text: piece, strong, em })
    }
  }
  return out
}

export function renderTex(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, { displayMode, throwOnError: false, strict: 'ignore', macros: { ...MACROS } })
}
