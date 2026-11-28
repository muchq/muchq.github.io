import { expect, test, type Page } from '@playwright/test'

import { createDictionary } from '../server/wordchains/puzzles'
import { endpoints, words } from '../server/wordchains/words'
import { SOLO_API } from '../src/apps/wordchains/solo/contract'

const dictionary = createDictionary(words, endpoints)

const submit = async (page: Page, word: string) => {
  const input = page.getByRole('textbox', { name: 'Next word' })
  await input.fill(word)
  await input.press('Enter')
}

const openEasy = async (page: Page, mode: string) => {
  await page.getByRole('radio', { name: new RegExp(mode) }).check()
  await page.getByRole('radio', { name: /Easy/ }).check()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
}

test('the server gives a repeatable daily puzzle from the Yep menu', async ({ page }) => {
  await page.goto('/top/sets')
  await page.getByRole('link', { name: 'Yep', exact: true }).click()
  await page.getByRole('link', { name: 'Wordchains', exact: true }).click()
  await expect(page).toHaveURL(/\/wordchains$/)
  await openEasy(page, 'Daily Challenge')
  const puzzle = page.getByRole('heading', { name: /^[A-Z]{3} → [A-Z]{3}$/ })
  const heading = (await puzzle.textContent())!
  const [start, target] = heading.toLowerCase().split(' → ')
  const path = dictionary.path(start, target)!
  await expect(page.getByRole('button', { name: 'Hint' })).toHaveCount(0)
  const invalidMove = ['cat', 'dog', 'pen'].find(word => (
    Array.from(word).filter((letter, index) => letter !== start[index]).length > 1
  ))!
  await submit(page, invalidMove)
  await expect(page.getByRole('status')).toHaveText('Change exactly one letter')
  await submit(page, 'zzz')
  await expect(page.getByRole('status')).toHaveText('Not in dictionary')
  await submit(page, path[1])
  await expect(page.getByText('1 step', { exact: true })).toBeVisible()
  await submit(page, start)
  await expect(page.getByRole('status')).toHaveText('Already in the chain')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('0 steps', { exact: true })).toBeVisible()
  for (const word of path.slice(1)) await submit(page, word)
  await expect(page.getByRole('heading', { name: 'Optimal!' })).toBeVisible()
  await expect(page.getByText('+150', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Back to menu' }).click()
  await expect(page.getByLabel('Session stats').getByText('150', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
})

test('Time Attack advances rounds without hints, then remembers the best for that difficulty', async ({ page }) => {
  await page.route(`**${SOLO_API}`, route => {
    if (route.request().postDataJSON()?.action === 'start') {
      return route.fulfill({ json: { start: 'cat', target: 'dog' } })
    }
    return route.continue()
  })
  const start = new Date('2026-11-26T12:00:00Z')
  await page.clock.install({ time: start })
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/wordchains')
  await openEasy(page, 'Time Attack')
  await expect(page.getByText('Time left')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hint' })).toHaveCount(0)
  for (const word of ['cot', 'dot', 'dog']) await submit(page, word)
  await expect(page.getByRole('status')).toContainText('Solved!')
  await page.clock.runFor(800)
  await expect(page.getByText('0 steps', { exact: true })).toBeVisible()
  await page.clock.fastForward(90_000)
  await expect(page.getByRole('heading', { name: 'Time’s up' })).toBeVisible()
  await expect(page.getByText('New personal best!')).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('wordchains.timeAttackBest.3.90s'))).toBe('150')
  await page.getByRole('button', { name: 'Play again' }).click()
  // The clock only fires timers that already exist. The next round installs
  // its countdown after this click's puzzle response, so wait for that round
  // before jumping ahead.
  await expect(page.getByRole('heading', { name: 'CAT → DOG' })).toBeVisible()
  await expect(page.getByText('0 steps', { exact: true })).toBeVisible()
  await page.clock.fastForward(91_000)
  await expect(page.getByRole('heading', { name: 'Time’s up' })).toBeVisible()
  await expect(page.getByText('150', { exact: true })).toBeVisible()
  await expect(page.getByText('New personal best!')).toHaveCount(0)
})

test('Quick Play starts five-letter puzzles and keeps the controls on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/wordchains')
  await expect(page.getByRole('radio', { name: /Quick Play/ })).toBeChecked()
  await page.getByRole('radio', { name: /Hard/ }).check()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('heading', { name: /^[A-Z]{5} → [A-Z]{5}$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Hint' })).toBeInViewport()
  await submit(page, 'cat')
  await expect(page.getByRole('status')).toHaveText('Must be 5 letters')
  await page.getByRole('button', { name: 'Hint' }).click()
  const input = page.getByRole('textbox', { name: 'Next word' })
  await expect(input).toHaveValue(/^[a-z]{5}$/)
  await input.press('Enter')
  await expect(page.getByText('1 step', { exact: true })).toBeVisible()
})

test('the browser receives puzzle words and no dictionary or seed', async ({ request }) => {
  const response = await request.post(SOLO_API, { data: { action: 'start', mode: 'daily', length: 3 } })
  expect(response.ok()).toBe(true)
  const puzzle = await response.json()
  expect(Object.keys(puzzle).sort()).toEqual(['start', 'target'])
  const hint = await request.post(SOLO_API, { data: { action: 'hint', mode: 'daily', puzzle, chain: [puzzle.start] } })
  expect(hint.status()).toBe(400)
  const dictionarySource = await request.get('/server/wordchains/words.ts')
  expect(dictionarySource.status()).toBe(403)
  const oldDictionary = await request.get('/wordchains/words.txt')
  expect(await oldDictionary.text()).not.toContain(words.slice(0, 80))
})
