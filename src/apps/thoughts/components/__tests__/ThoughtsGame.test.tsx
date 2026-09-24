import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { HubWorldLink } from '@/utils/hubWorldLink'
import { CommandRegistry } from '@/utils/commandRegistry'
import { tap, tripleTap } from '@/test/touch'

// The world's own surface, as the page mounts it. The renderer has its
// own tests; this is the component's part: what a finger on the world
// asks for.

vi.mock('@/hooks/useThoughtsGame', () => ({ useThoughtsGame: () => ({ initializeGame: () => () => {} }) }))

import ThoughtsGame from '../ThoughtsGame'

describe('ThoughtsGame', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const mount = (onTripleTap = vi.fn()) => {
    const { container } = render(
      <ThoughtsGame link={{} as HubWorldLink} commands={new CommandRegistry()} onTripleTap={onTripleTap} />
    )
    return { world: container.firstElementChild as HTMLElement, onTripleTap }
  }

  it('three taps on the world ask for the command menu', () => {
    const { world, onTripleTap } = mount()
    tripleTap(world)
    expect(onTripleTap).toHaveBeenCalledTimes(1)
  })

  it('taps on a control over the world are the control’s', () => {
    const { onTripleTap } = mount()
    const sound = screen.getByRole('button', { name: /Sound/ })
    tap(sound)
    tap(sound)
    tap(sound)
    expect(onTripleTap).not.toHaveBeenCalled()
  })
})
