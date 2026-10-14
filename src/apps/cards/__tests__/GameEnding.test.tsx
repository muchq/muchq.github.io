import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GameEnding from '../GameEnding'

// A card table's two ways on once a game is over.

afterEach(cleanup)

const props = (over: Partial<Parameters<typeof GameEnding>[0]> = {}) => ({
  onPlayAgain: vi.fn(),
  onBack: vi.fn(),
  opening: false,
  connected: true,
  ...over,
})

describe('GameEnding', () => {
  it('offers Play again and Back to the room, each sending its own action', () => {
    const p = props()
    render(<GameEnding {...p} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(p.onPlayAgain).toHaveBeenCalledTimes(1)
    expect(p.onBack).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }))
    expect(p.onBack).toHaveBeenCalledTimes(1)
  })

  it('says Opening… and holds Play again while the next table opens', () => {
    render(<GameEnding {...props({ opening: true })} />)
    expect(screen.queryByRole('button', { name: 'Play again' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Opening…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Back to the room' })).toBeEnabled()
  })

  it('holds Play again offline but leaves Back open', () => {
    render(<GameEnding {...props({ connected: false })} />)
    expect(screen.getByRole('button', { name: 'Play again' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Back to the room' })).toBeEnabled()
  })

  it('offers only Back when there is no Play again yet', () => {
    render(<GameEnding {...props({ onPlayAgain: undefined })} />)
    expect(screen.queryByRole('button', { name: 'Play again' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Back to the room' })).toBeEnabled()
  })

  it('hands Play again to the ref the table focuses', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<GameEnding {...props({ playAgainRef: ref })} />)
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Play again' }))
  })
})
