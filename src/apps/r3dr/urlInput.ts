// Bare domains are the common paste; give them the scheme the API requires.
// Schemes are case-insensitive (the API's pattern is not), so an uppercased
// http(s) is lowercased rather than bounced with a confusing message. Other
// schemes pass through untouched and fail validation.
export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^[^:]+/, scheme => scheme.toLowerCase())
  }
  if (trimmed === '' || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

// The API's traits (@length 11–1000, @pattern ^https?://), mirrored for
// instant feedback. Lengths count code points, like the server does. The
// server still enforces them.
export function validateUrl(url: string): string | null {
  if (url === '') return 'Paste a link first.'
  if (!/^https?:\/\//.test(url)) return 'Links must start with http:// or https://.'
  const length = [...url].length
  if (length < 11) return 'That URL looks too short.'
  if (length > 1000) return 'URLs top out at 1000 characters.'
  return null
}
