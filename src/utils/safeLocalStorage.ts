// localStorage that shrugs instead of throwing — private mode and
// storage-denied contexts make every direct call a potential exception.

export const safeLocalStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Not persisted; callers degrade gracefully.
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // Nothing to remove.
    }
  }
}
