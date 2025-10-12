/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
  interface Assertion<T = any> extends TestingLibraryMatchers<T, void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers {}
}