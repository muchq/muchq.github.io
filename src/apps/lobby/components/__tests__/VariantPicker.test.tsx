import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import VariantPicker from '../VariantPicker'

// Every table that offers a choice of game offers it the same way: one
// list, one button that names what it starts.

const options = [
  { value: 'partners', label: 'partners' },
  { value: 'cutthroat', label: 'cutthroat' }
] as const

describe('VariantPicker', () => {
  afterEach(cleanup)

  it('a choice is a labelled list and one button naming the pick', () => {
    const onChange = vi.fn()
    const onAction = vi.fn()
    render(<VariantPicker label="Game" options={options} value="partners" onChange={onChange} action={option => `Start ${option.label}`} onAction={onAction} />)
    const list = screen.getByRole('combobox', { name: 'Game' })
    fireEvent.change(list, { target: { value: 'cutthroat' } })
    expect(onChange).toHaveBeenCalledWith('cutthroat')
    fireEvent.click(screen.getByRole('button', { name: 'Start partners' }))
    expect(onAction).toHaveBeenCalledWith('partners')
  })

  it('one option is no choice: no list, the button acts on it', () => {
    const onAction = vi.fn()
    render(<VariantPicker label="Game" options={[options[1]]} value="cutthroat" onChange={vi.fn()} action="Start" onAction={onAction} />)
    expect(screen.queryByRole('combobox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(onAction).toHaveBeenCalledWith('cutthroat')
  })

  // Seats leave and the pick goes with them: the first option left stands in.
  it('a pick no longer on offer acts on the first option', () => {
    const onAction = vi.fn()
    render(<VariantPicker label="Game" options={[options[1]]} value="partners" onChange={vi.fn()} action={option => `Start ${option.label}`} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start cutthroat' }))
    expect(onAction).toHaveBeenCalledWith('cutthroat')
  })

  it('nothing on offer draws nothing', () => {
    const { container } = render(<VariantPicker label="Game" options={[]} value="partners" onChange={vi.fn()} action="Start" onAction={vi.fn()} />)
    expect(container.childElementCount).toBe(0)
  })

  it('the list shows the pick it acts on', () => {
    const three = [...options, { value: 'solo', label: 'solo' }]
    render(<VariantPicker label="Game" options={three.slice(1)} value="partners" onChange={vi.fn()} action="Start" onAction={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: 'Game' })).toHaveProperty('value', 'cutthroat')
  })

  it('disabled holds the list and the button', () => {
    render(<VariantPicker label="Game" options={options} value="partners" onChange={vi.fn()} action="Start" onAction={vi.fn()} disabled />)
    expect(screen.getByRole('combobox', { name: 'Game' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
  })
})
