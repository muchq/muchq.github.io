import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Node 22.4+ puts localStorage/sessionStorage on globalThis itself, and without
// --localstorage-file the getter returns undefined. That own property shadows
// the store jsdom installs, so `localStorage.clear()` throws on a newer Node
// while passing on an older one — the same suite goes red purely on runtime.
//
// jsdom's own store is unreachable from here: under vitest's jsdom environment
// `window` IS globalThis, so reading window.localStorage returns the same
// undefined. Install a store instead. It is per test file, since setupFiles run
// once per file, which also removes the cross-file leakage a shared one has.
const memoryStorage = (): Storage => {
  let entries = new Map<string, string>()
  return {
    get length() {
      return entries.size
    },
    key: (i: number) => [...entries.keys()][i] ?? null,
    getItem: (k: string) => entries.get(k) ?? null,
    setItem: (k: string, v: string) => void entries.set(k, String(v)),
    removeItem: (k: string) => void entries.delete(k),
    clear: () => void (entries = new Map()),
  }
}

for (const key of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(globalThis, key, { value: memoryStorage(), configurable: true })
}

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})