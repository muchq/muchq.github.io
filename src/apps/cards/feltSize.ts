// How big the felt circle is: the largest square that fits the table's
// width and the height left after the lobby overlay and the table's own
// chrome (header, gaps, scoreboard). Below feltMin the overlay scrolls.
//
// felt.module.css applies the same policy with ringSlot (cqw/cqh) so the
// real header and scoreboard size the leftover; this closed form is what
// a test can pin (jsdom does not lay out).

export const FELT_MAX_WIDTH_PX = 52 * 16
export const FELT_MIN_PX = 30 * 16
/** LobbyGame.tableOverlay: top 60px + padding 3.5rem + 1rem. */
export const FELT_OVERLAY_CHROME_PX = 60 + 4.5 * 16

export function feltSizePx(viewportWidth: number, viewportHeight: number, tableChromePx: number): number {
  const tableWidth = Math.min(viewportWidth, 960)
  const widthBudget = Math.min(tableWidth, FELT_MAX_WIDTH_PX)
  const overlayHeight = viewportHeight - FELT_OVERLAY_CHROME_PX
  const heightBudget = overlayHeight - tableChromePx
  return Math.max(FELT_MIN_PX, Math.min(widthBudget, heightBudget))
}
