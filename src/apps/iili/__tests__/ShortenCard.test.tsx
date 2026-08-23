import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ShortenCard from '../components/ShortenCard'
import * as api from '../api'

vi.mock('../api', { spy: true })

const NOW = 1755000000000
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const LINK_NAME = 'i.iili.uk/r/AQA'

describe('ShortenCard', () => {
  beforeEach(() => {
    // No global clearMocks in this repo's vitest config; the spy-mocked
    // api module keeps call history across tests without this.
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mints with the default 7-day expiry and shows the short link', async () => {
    vi.mocked(api.shorten).mockResolvedValue({ slug: 'AQA' })
    const onMinted = vi.fn()
    render(<ShortenCard onMinted={onMinted} />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Long link'), 'https://example.com/page')
    await user.click(screen.getByRole('button', { name: 'Shorten' }))

    expect(api.shorten).toHaveBeenCalledWith('https://example.com/page', NOW + 7 * DAY)
    expect(await screen.findByRole('link', { name: LINK_NAME })).toHaveAttribute(
      'href',
      'https://i.iili.uk/r/AQA'
    )
    expect(screen.getByText(/expires in 7 days/)).toBeDefined()
    expect(onMinted).toHaveBeenCalledWith({
      slug: 'AQA',
      longUrl: 'https://example.com/page',
      expiresAt: NOW + 7 * DAY,
    })
    // Ready for the next paste.
    expect(screen.getByLabelText('Long link')).toHaveValue('')
  })

  it('mints a bare domain through the real form', async () => {
    vi.mocked(api.shorten).mockResolvedValue({ slug: 'AQA' })
    render(<ShortenCard onMinted={vi.fn()} />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Long link'), 'example.com/page')
    await user.click(screen.getByRole('button', { name: 'Shorten' }))

    await screen.findByRole('link', { name: LINK_NAME })
    expect(api.shorten).toHaveBeenCalledWith('https://example.com/page', NOW + 7 * DAY)
  })

  it('mints with a chosen expiry chip, the 30-day one under the ceiling', async () => {
    vi.mocked(api.shorten).mockResolvedValue({ slug: 'AQA' })
    render(<ShortenCard onMinted={vi.fn()} />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '30 days' }))
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'false')

    await user.type(screen.getByLabelText('Long link'), 'https://example.com/page')
    await user.click(screen.getByRole('button', { name: 'Shorten' }))

    expect(api.shorten).toHaveBeenCalledWith('https://example.com/page', NOW + 30 * DAY - 5 * MINUTE)
  })

  it('asks for a link on an empty submit', async () => {
    render(<ShortenCard onMinted={vi.fn()} />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Shorten' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/paste/i)
    expect(api.shorten).not.toHaveBeenCalled()
  })

  it('blocks invalid input before it reaches the API', async () => {
    render(<ShortenCard onMinted={vi.fn()} />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Long link'), 'ftp://example.com')
    await user.click(screen.getByRole('button', { name: 'Shorten' }))

    expect(screen.getByRole('alert')).toHaveTextContent('http:// or https://')
    expect(api.shorten).not.toHaveBeenCalled()
  })

  it('shows the API error and clears it on the next success', async () => {
    vi.mocked(api.shorten).mockRejectedValueOnce(new Error('expiresAt is in the past'))
    vi.mocked(api.shorten).mockResolvedValueOnce({ slug: 'AQA' })
    render(<ShortenCard onMinted={vi.fn()} />)

    const user = userEvent.setup()
    const field = screen.getByLabelText('Long link')
    await user.type(field, 'https://example.com/page')
    await user.click(screen.getByRole('button', { name: 'Shorten' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('expiresAt is in the past')

    await user.clear(field)
    await user.type(field, 'https://example.com/page')
    await user.click(screen.getByRole('button', { name: 'Shorten' }))
    await screen.findByRole('link', { name: LINK_NAME })
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
  })

  it('ignores a second submit while one is in flight', async () => {
    let release!: (value: { slug: string }) => void
    vi.mocked(api.shorten).mockImplementation(() => new Promise(resolve => (release = resolve)))
    render(<ShortenCard onMinted={vi.fn()} />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Long link'), 'https://example.com/page')
    await user.click(screen.getByRole('button', { name: 'Shorten' }))

    // Busy, never disabled: disabling would blur keyboard focus.
    const busy = screen.getByRole('button', { name: 'Shortening…' })
    expect(busy).not.toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')
    await user.click(busy)

    release({ slug: 'AQA' })
    await screen.findByRole('link', { name: LINK_NAME })
    expect(api.shorten).toHaveBeenCalledTimes(1)
  })

  it('keeps text typed while the request was in flight', async () => {
    let release!: (value: { slug: string }) => void
    vi.mocked(api.shorten).mockImplementation(() => new Promise(resolve => (release = resolve)))
    render(<ShortenCard onMinted={vi.fn()} />)

    const user = userEvent.setup()
    const field = screen.getByLabelText('Long link')
    await user.type(field, 'https://example.com/first')
    await user.click(screen.getByRole('button', { name: 'Shorten' }))
    await user.clear(field)
    await user.type(field, 'https://example.com/next')

    release({ slug: 'AQA' })
    await screen.findByRole('link', { name: LINK_NAME })
    expect(field).toHaveValue('https://example.com/next')
  })
})
