// Renders the curriculum's markup (see ./parse.ts). The only HTML injected is
// KaTeX's own output; student text is never parsed as HTML.
import 'katex/dist/katex.min.css'
import { Fragment, type ReactNode } from 'react'
import { parseBlocks, parseInline, renderTex } from './parse'

function Tex({ tex, display }: { tex: string; display: boolean }) {
  const html = renderTex(tex, display)
  return display ? (
    <div className="proofs-display-math" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  )
}

function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((piece, i) => {
        let node: ReactNode = piece.kind === 'math' ? <Tex tex={piece.text} display={false} /> : piece.text
        if (piece.em) node = <em>{node}</em>
        if (piece.strong) node = <strong>{node}</strong>
        return <Fragment key={i}>{node}</Fragment>
      })}
    </>
  )
}

/** Inline-only rendering, for titles and single lines. */
export function MarkupInline({ text }: { text: string }) {
  return <InlineText text={text} />
}

export default function Markup({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {parseBlocks(text).map((b, i) => {
        switch (b.kind) {
          case 'math':
            return <Tex key={i} tex={b.tex} display />
          case 'ul':
          case 'ol': {
            const List = b.kind
            return (
              <List key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>
                    <InlineText text={item} />
                  </li>
                ))}
              </List>
            )
          }
          case 'p':
            return (
              <p key={i}>
                <InlineText text={b.text} />
              </p>
            )
        }
      })}
    </div>
  )
}
