import type { ReactNode } from 'react'
import styles from './Groups.module.css'

// The textbook furniture every chapter is built from.

interface BlockProps {
  /** e.g. "Lagrange" in "Theorem (Lagrange)" */
  name?: string
  children: ReactNode
}

const Block = ({ kind, name, className, children }: BlockProps & { kind: string; className: string }) => (
  // A note, not an <aside>: these blocks are the main text, not page landmarks.
  <div role="note" className={`${styles.block} ${className}`} aria-label={name ? `${kind}: ${name}` : kind}>
    <p className={styles.blockTitle}>
      {kind}
      {name && <span className={styles.blockName}> ({name})</span>}
    </p>
    {children}
  </div>
)

export const Definition = (props: BlockProps) => <Block kind="Definition" className={styles.definition} {...props} />

export const Theorem = ({ kind = 'Theorem', ...props }: BlockProps & { kind?: 'Theorem' | 'Lemma' | 'Corollary' | 'Proposition' }) => (
  <Block kind={kind} className={styles.theorem} {...props} />
)

export const Example = (props: BlockProps) => <Block kind="Example" className={styles.example} {...props} />

export const Remark = ({ kind = 'Remark', ...props }: BlockProps & { kind?: 'Remark' | 'Warning' | 'Notation' }) => (
  <Block kind={kind} className={styles.remark} {...props} />
)

/** Collapsed by default: try the argument first. */
export const Proof = ({ children, label = 'Proof' }: { children: ReactNode; label?: string }) => (
  <details className={styles.proof}>
    <summary>{label}</summary>
    <div className={styles.proofBody}>
      {children}
      <span className={styles.qed} aria-label="end of proof">
        ∎
      </span>
    </div>
  </details>
)

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className={styles.section}>
    <h2>{title}</h2>
    {children}
  </section>
)

/** A displayed formula, centered on its own line. */
export const Display = ({ children }: { children: ReactNode }) => <p className={styles.display}>{children}</p>
