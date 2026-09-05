import { describe, expect, it } from 'vitest'
import { isValidId } from '../hubIds'

describe('isValidId', () => {
  it('takes the hub\'s alphanumeric codes, hyphens included', () => {
    for (const id of ['abc123', 'ABC123', '123', 'Room1', 'abc-123']) expect(isValidId(id)).toBe(true)
  })

  it('refuses anything else, and nothing', () => {
    for (const id of ['', 'abc_123', 'abc 123', 'abc@123', 'abc.123', undefined]) expect(isValidId(id)).toBe(false)
  })
})
