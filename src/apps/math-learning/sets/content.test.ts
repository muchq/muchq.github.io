import { describe, expect, it } from 'vitest'
import { chapters, guide, references } from './content'
describe('Jech curriculum import', () => {
  it('preserves all 500 sequential problems and chapter prerequisites', () => {
    expect(chapters).toHaveLength(20)
    chapters.forEach((chapter, i) => {
      expect(chapter.number).toBe(i + 1)
      expect(chapter.reading).toContain('Read: Jech Ch.')
      expect(chapter.problems).toHaveLength(25)
      chapter.problems.forEach((p, j) => {
        expect(p.id).toBe(`${i + 1}.${j + 1}`)
        expect(p.text.length).toBeGreaterThan(10)
      })
    })
    expect(guide).toContain('46 weeks')
    expect(references).toContain('nothing here was machine-checked')
  })
})
