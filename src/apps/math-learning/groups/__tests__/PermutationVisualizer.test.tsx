import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PermutationVisualizer from '../components/PermutationVisualizer'

// The drag-to-build widget in Chapter 3. These tests were written against
// the version built on utils/permutation-builder and carried over to the
// port onto the course engine unchanged, except that the identity now
// reads "e", as it does everywhere else in the course.

const dataTransfer = () => ({ effectAllowed: '', dropEffect: '' })

const setup = () => {
  const { container } = render(<PermutationVisualizer />)
  const elements = () => [...container.querySelectorAll<HTMLElement>('[draggable]')]
  const mapsTo = () => screen.getByText('Maps to:').parentElement!.textContent!.replace('Maps to:', '')
  const cycle = () => screen.queryByText('Cycle notation:')?.nextElementSibling?.textContent ?? null
  /** Drags the element at `from` (0-based) onto position `to`: from + 1 ↦ to + 1. */
  const drag = (from: number, to: number) => {
    fireEvent.dragStart(elements()[from], { dataTransfer: dataTransfer() })
    const target = elements()[to].parentElement!
    fireEvent.dragOver(target, { dataTransfer: dataTransfer() })
    fireEvent.drop(target, { dataTransfer: dataTransfer() })
  }
  return { elements, mapsTo, cycle, drag }
}

describe('PermutationVisualizer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as { ontouchstart?: unknown }).ontouchstart
  })

  it('starts at the identity', () => {
    const { mapsTo, cycle } = setup()
    expect(mapsTo()).toBe('1234')
    expect(cycle()).toBe('e')
  })

  it('a drag that breaks injectivity names the collision instead of a cycle', () => {
    const { mapsTo, cycle, drag } = setup()
    drag(0, 2)
    expect(mapsTo()).toBe('3234')
    expect(cycle()).toBeNull()
    expect(screen.getByText('Multiple mappings to same target: 1, 3 → 3')).toBeInTheDocument()
  })

  it('names every collision when there are several', () => {
    const { drag } = setup()
    drag(0, 1)
    drag(2, 3)
    expect(screen.getByText('Multiple mappings to same target: 1, 2 → 2; 3, 4 → 4')).toBeInTheDocument()
  })

  it('completing the swap gives a bijection and its cycles', () => {
    const { mapsTo, cycle, drag } = setup()
    drag(0, 2)
    drag(2, 0)
    expect(mapsTo()).toBe('3214')
    expect(cycle()).toBe('(1 3)')
  })

  it('the clear button sends a point back to itself', () => {
    const { mapsTo, cycle, drag } = setup()
    drag(0, 2)
    fireEvent.click(screen.getByRole('button', { name: 'Clear mapping for 1' }))
    expect(mapsTo()).toBe('1234')
    expect(cycle()).toBe('e')
    // Only moved points get a clear button.
    expect(screen.queryByRole('button', { name: /Clear mapping/ })).toBeNull()
  })

  it('Random shuffles (Fisher–Yates on Math.random) and Reset restores the identity', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { mapsTo, cycle } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Random' }))
    expect(mapsTo()).toBe('2341')
    expect(cycle()).toBe('(1 2 3 4)')
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(mapsTo()).toBe('1234')
  })

  it('on a touch screen, two taps make a mapping', () => {
    Object.defineProperty(window, 'ontouchstart', { value: null, configurable: true, writable: true })
    const { elements, mapsTo } = setup()
    expect(screen.getByText(/Tap two numbers to create a mapping/)).toBeInTheDocument()
    fireEvent.touchEnd(elements()[1])
    expect(screen.getByText(/Now tap where 2 should map to/)).toBeInTheDocument()
    fireEvent.touchEnd(elements()[3])
    expect(mapsTo()).toBe('1434')
    expect(screen.queryByText(/Now tap where/)).toBeNull()
  })

  it('on a touch screen, tapping the same number twice cancels', () => {
    Object.defineProperty(window, 'ontouchstart', { value: null, configurable: true, writable: true })
    const { elements, mapsTo } = setup()
    fireEvent.touchEnd(elements()[1])
    fireEvent.touchEnd(elements()[1])
    expect(screen.queryByText(/Now tap where/)).toBeNull()
    expect(mapsTo()).toBe('1234')
  })
})
