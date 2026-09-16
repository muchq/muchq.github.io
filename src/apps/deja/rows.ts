// The tape's rows carry an id per seq so the surprise strip can jump to one.
export const rowId = (seq: number) => `deja-row-${seq}`

// jsdom, and older browsers, have elements without scrollIntoView; finding a
// row is a convenience, never a reason to throw.
export const scrollToRow = (seq: number) =>
  document.getElementById(rowId(seq))?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
