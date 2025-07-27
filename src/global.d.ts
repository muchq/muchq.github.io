/// <reference types="react" />

import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      // MathML elements
      math: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      mfrac: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      mn: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      mi: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      mo: DetailedHTMLProps<HTMLAttributes<HTMLElement> & { stretchy?: string }, HTMLElement>
      mspace: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      semantics: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      mrow: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      msub: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      msubsup: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}

export {}