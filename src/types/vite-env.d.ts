/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare namespace JSX {
  interface IntrinsicElements {
    math: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { className?: string }, HTMLElement>
    mfrac: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    mn: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    mi: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    mo: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { stretchy?: string }, HTMLElement>
    mspace: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    semantics: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    mrow: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    msub: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    msubsup: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
  }
}