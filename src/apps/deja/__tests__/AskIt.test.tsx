import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AskIt from '../components/AskIt'
import type { NextResult } from '../api'

const tokens = ['alpha', 'beta', 'gamma', 'delta', 'eps', 'zeta', 'eta', 'theta', 'iota']

const setup = (result: NextResult) => {
  const ask = vi.fn().mockResolvedValue(result)
  render(<AskIt tokens={tokens} ask={ask} />)
  return { ask, user: userEvent.setup() }
}

const pick = async (user: ReturnType<typeof userEvent.setup>, ...names: string[]) => {
  const input = screen.getByRole('combobox', { name: 'Context tokens' })
  for (const name of names) {
    await user.type(input, `${name}{enter}`)
  }
}

describe('AskIt', () => {
  it('asks with the picked tokens in order and shows both predictors', async () => {
    const { ask, user } = setup({
      kind: 'ok',
      predictions: {
        bigram: [{ token: 'gamma', p: 0.7 }, { token: 'delta', p: 0.2 }],
        net: [{ token: 'delta', p: 0.6 }],
      },
    })
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled()
    await pick(user, 'beta', 'alpha')
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(ask).toHaveBeenCalledWith(['beta', 'alpha'])
    const bigram = within(await screen.findByTestId('ask-bigram'))
    expect(bigram.getAllByRole('meter').map((m) => m.getAttribute('aria-label'))).toEqual(['gamma', 'delta'])
    expect(within(screen.getByTestId('ask-net')).getByRole('meter')).toHaveAttribute('aria-valuenow', '0.6')
  })

  it('reads the net as a dash while it is null', async () => {
    const { user } = setup({ kind: 'ok', predictions: { bigram: [{ token: 'gamma', p: 1 }], net: null } })
    await pick(user, 'beta')
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(await screen.findByTestId('ask-net')).toHaveTextContent('—')
  })

  it('says quietly that the route is not deployed yet', async () => {
    const { user } = setup({ kind: 'not-deployed' })
    await pick(user, 'beta')
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(await screen.findByText(/not deployed yet/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a rejection message and an outage as errors', async () => {
    const { ask, user } = setup({ kind: 'rejected', message: 'unknown token: beta' })
    await pick(user, 'beta')
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('unknown token: beta')
    ask.mockResolvedValue({ kind: 'unavailable' })
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/unavailable/i)
  })

  it('an ask that throws reads as an outage and hands the button back', async () => {
    const { ask, user } = setup({ kind: 'not-deployed' })
    ask.mockRejectedValue(new Error('bug'))
    await pick(user, 'beta')
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/unavailable/i)
    expect(screen.getByRole('button', { name: 'Ask' })).toBeEnabled()
  })

  it('takes no more than eight tokens', async () => {
    const { ask, user } = setup({ kind: 'not-deployed' })
    await pick(user, ...tokens)
    await user.click(screen.getByRole('button', { name: 'Ask' }))
    expect(ask).toHaveBeenCalledWith(tokens.slice(0, 8))
  })
})
