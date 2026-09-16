import { afterEach, describe, expect, it, vi } from 'vitest'
import { rowId, scrollToRow } from '../rows'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('scrollToRow', () => {
  it('scrolls the row with that seq into view', () => {
    const scroll = vi.fn()
    const proto = Element.prototype as Element & { scrollIntoView?: typeof scroll }
    const had = proto.scrollIntoView
    proto.scrollIntoView = scroll
    try {
      const row = document.createElement('div')
      row.id = rowId(7)
      document.body.append(row)
      scrollToRow(7)
      expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
      expect(scroll.mock.instances[0]).toBe(row)
    } finally {
      proto.scrollIntoView = had
    }
  })

  it('is a no-op for a row not held, and where the element cannot scroll', () => {
    expect(() => scrollToRow(7)).not.toThrow()
    const row = document.createElement('div')
    row.id = rowId(7)
    document.body.append(row)
    // jsdom's elements have no scrollIntoView at all.
    expect(() => scrollToRow(7)).not.toThrow()
  })
})
