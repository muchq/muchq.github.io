import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OutcomeDot } from '../components/OutcomeDot'
import { rowId } from '../rows'
import type { CurvePoint } from '../tape'

const point = (outcome: CurvePoint['outcome']): CurvePoint => ({ seq: 14, outcome, bigram: 1, surpriseBigram: 7 })

// jsdom has no scrollIntoView; the stub is what a click or key must reach.
const scrolled = vi.fn()
const proto = Element.prototype as Element & { scrollIntoView?: typeof scrolled }
proto.scrollIntoView = scrolled

afterEach(() => scrolled.mockClear())

// Recharts clones the dot per point inside the chart's svg, with cx, cy and
// the point as payload.
const draw = (outcome: CurvePoint['outcome']) =>
  render(
    <>
      <div id={rowId(14)} />
      <svg>
        <OutcomeDot cx={10} cy={20} payload={point(outcome)} />
      </svg>
    </>
  )

describe('OutcomeDot', () => {
  it('marks an anomaly as a focusable button that finds the row by click, Enter or Space', () => {
    draw('anomaly')
    const dot = screen.getByRole('button', { name: 'anomaly at #14' })
    expect(dot).toHaveAttribute('tabindex', '0')
    expect(dot).toHaveAttribute('cx', '10')
    fireEvent.click(dot)
    expect(scrolled).toHaveBeenCalledTimes(1)
    expect(scrolled.mock.instances[0]).toBe(document.getElementById(rowId(14)))
    fireEvent.keyDown(dot, { key: 'Enter' })
    fireEvent.keyDown(dot, { key: ' ' })
    expect(scrolled).toHaveBeenCalledTimes(3)
    fireEvent.keyDown(dot, { key: 'a' })
    expect(scrolled).toHaveBeenCalledTimes(3)
  })

  it('marks a novelty, and draws nothing for a hit', () => {
    draw('novel')
    expect(screen.getByRole('button', { name: 'novel at #14' })).toBeInTheDocument()
    draw('hit')
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})
