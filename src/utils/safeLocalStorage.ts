// Web storage that shrugs instead of throwing — private mode and
// storage-denied contexts make every direct call a potential exception.

function safeStorage(store: () => Storage) {
  return {
    get(key: string): string | null {
      try {
        return store().getItem(key)
      } catch {
        return null
      }
    },
    set(key: string, value: string): void {
      try {
        store().setItem(key, value)
      } catch {
        // Not persisted; callers degrade gracefully.
      }
    },
    remove(key: string): void {
      try {
        store().removeItem(key)
      } catch {
        // Nothing to remove.
      }
    }
  }
}

// Shared by every tab of the site.
export const safeLocalStorage = safeStorage(() => localStorage)
// This tab's own; survives a reload, not a new tab.
export const safeSessionStorage = safeStorage(() => sessionStorage)
