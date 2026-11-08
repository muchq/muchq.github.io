import { describe, expect, it } from 'vitest'
import {
  answerInput,
  checkAnswer,
  choice,
  dihedralElement,
  formatAnswer,
  int,
  list,
  sum,
  normalizeText,
  perm,
  set,
  text,
  yesNo,
} from '../problems/answers'

describe('checkAnswer', () => {
  it('integers: tolerates whitespace and a sign, nothing else', () => {
    const a = int(6)
    for (const ok of ['6', ' 6 ', '+6']) expect(checkAnswer(a, ok), ok).toBe(true)
    for (const bad of ['', '6.0', 'six', '7', '6 7']) expect(checkAnswer(a, bad), bad).toBe(false)
    expect(checkAnswer(int(-1), '−1')).toBe(true)
  })

  it('sets: any order, braces or not, duplicates folded', () => {
    const a = set(1, 5, 7, 11)
    for (const ok of ['1, 5, 7, 11', '{11,7,5,1}', '1 5 7 11', '1, 1, 5, 7, 11']) expect(checkAnswer(a, ok), ok).toBe(true)
    for (const bad of ['1, 5, 7', '1, 5, 7, 11, 13', '1, 5, x, 11', '']) expect(checkAnswer(a, bad), bad).toBe(false)
  })

  it('multisets count repeats — a set would not', () => {
    const classEquation = sum(1, 1, 2, 2, 2)
    expect(checkAnswer(classEquation, '1 + 1 + 2 + 2 + 2')).toBe(true)
    expect(checkAnswer(classEquation, '2 + 1 + 2 + 1 + 2')).toBe(true)
    expect(checkAnswer(classEquation, '1 + 2 + 2 + 2')).toBe(false)
    // The control: the same input as a set is accepted.
    expect(checkAnswer(set(1, 2), '1 + 2 + 2 + 2')).toBe(true)
  })

  it('permutations are compared as permutations, not strings', () => {
    const a = perm(3, '(1 2 3)')
    for (const ok of ['(1 2 3)', '(2 3 1)', '(3 1 2)', '(123)', '(1,2,3)', '(1 2)(2 3)']) expect(checkAnswer(a, ok), ok).toBe(true)
    for (const bad of ['(1 3 2)', 'e', '(1 2', '1 2 3', '(1 2 4)']) expect(checkAnswer(a, bad), bad).toBe(false)
    expect(checkAnswer(perm(4, 'e'), '()')).toBe(true)
  })

  it('an official answer that is not a permutation fails loudly', () => {
    expect(() => checkAnswer(perm(3, '(1 4)'), '(1 2)')).toThrow()
  })

  it('choices check the selected index', () => {
    const a = choice(['ℤ₄', 'ℤ₂ × ℤ₂'], 'ℤ₂ × ℤ₂')
    expect(checkAnswer(a, '1')).toBe(true)
    expect(checkAnswer(a, '0')).toBe(false)
    expect(checkAnswer(yesNo(false), '1')).toBe(true)
    expect(() => choice(['a'], 'b')).toThrow()
  })

  it('dihedral elements accept the spelled-out first power and names for e', () => {
    for (const ok of ['sr', 'sr¹', 'sr^1']) expect(checkAnswer(dihedralElement('sr'), ok), ok).toBe(true)
    for (const ok of ['e', '1', 'id']) expect(checkAnswer(dihedralElement('e'), ok), ok).toBe(true)
    expect(checkAnswer(dihedralElement('sr'), 'sr2')).toBe(false)
    expect(checkAnswer(dihedralElement('r²'), 'r21')).toBe(false)
  })

  it('text folds superscripts, carets, case, and spaces', () => {
    const a = text(['sr²'])
    for (const ok of ['sr²', 'sr^2', 'SR2', 's r ^ 2']) expect(checkAnswer(a, ok), ok).toBe(true)
    for (const bad of ['sr³', 'rs²', 's']) expect(checkAnswer(a, bad), bad).toBe(false)
    expect(normalizeText('ℤ₂ × ℤ₄')).toBe('z2×z4')
  })

  it('the formatted answer is always accepted', () => {
    for (const a of [int(4), set(3, 1, 2), sum(2, 1, 2), list(6, 2), perm(5, '(1 2)(3 4 5)'), yesNo(true), text(['r³'])]) {
      expect(checkAnswer(a, answerInput(a)), formatAnswer(a)).toBe(true)
    }
    expect(formatAnswer(set(3, 1, 2, 2))).toBe('{1, 2, 3}')
    expect(formatAnswer(sum(2, 1, 2))).toBe('1 + 2 + 2')
    // Invariant factors are a list, not a sum, though repeats count in both.
    expect(formatAnswer(list(36, 6))).toBe('6, 36')
    expect(checkAnswer(list(2, 2, 6), '2, 6')).toBe(false)
    expect(checkAnswer(list(2, 2, 6), '6, 2, 2')).toBe(true)
  })
})
