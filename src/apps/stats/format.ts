export const n = (value: number) => value.toLocaleString()

// A table whose endpoint failed says so; "no rows" is a claim about the
// data, and this page never got any to make it about.
export const UNAVAILABLE = 'Not available from the stats service.'

// Nor has a table whose endpoint has not answered yet — and a slow
// endpoint is not a missing one, so the two say different things.
export const LOADING = 'Still loading.'

/**
 * What a table with no rows should say, for an endpoint fetched on its own
 * chain: `undefined` is a request still in flight, `null` one that failed,
 * and anything else really did come back with nothing.
 */
export const emptyText = <T,>(source: T | null | undefined, empty: string) =>
  source === undefined ? LOADING : source === null ? UNAVAILABLE : empty
