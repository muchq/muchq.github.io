// Room and table ids as the hub mints them: alphanumeric codes. Hyphens
// are tolerated so an unexpected id shape degrades to "not a link"
// instead of a throw mid-render.
export function isValidId(id: string | undefined): boolean {
  if (!id) return false
  return /^[a-zA-Z0-9-]+$/.test(id)
}
