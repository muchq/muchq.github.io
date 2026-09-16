// The tape's rows carry an id per seq so the surprise strip can jump to one.
export const rowId = (seq: number) => `deja-row-${seq}`

export const scrollToRow = (seq: number) =>
  document.getElementById(rowId(seq))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
