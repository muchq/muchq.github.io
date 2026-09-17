// Access-log tokens are long; the tape and bars show a shorter form and
// keep the full string on title / aria-label.
export function displayToken(token: string): string {
  const parts = token.split(' ')
  const method = parts[1]
  if (parts.length >= 3 && method !== undefined && /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(method)) {
    return `${method} ${parts[2]}`
  }
  return token.length > 32 ? `${token.slice(0, 31)}…` : token
}
