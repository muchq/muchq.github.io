import { describe, it, expect } from 'vitest'
import { isTypingTarget } from '../keyboard'

// The lobby puts a chat composer and a room-code field on the same
// document as the world's WASD and space handlers.

describe('isTypingTarget', () => {
  it('is a text field, a textarea, a select, or anything editable', () => {
    for (const tag of ['input', 'textarea', 'select']) {
      expect(isTypingTarget(document.createElement(tag))).toBe(true)
    }
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    expect(isTypingTarget(editable)).toBe(true)
  })

  it('is not a button, the body, or nothing', () => {
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
    expect(isTypingTarget(document.body)).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
