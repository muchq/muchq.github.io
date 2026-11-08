/**
 * Template tag for curriculum text: backslashes stay literal (so TeX reads as
 * TeX), and the source indentation of continuation lines is removed so that
 * list markers start their lines.
 */
export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  const raw = String.raw({ raw: strings.raw }, ...values)
  const lines = raw.split('\n')
  const indents = lines
    .slice(1)
    .filter(l => l.trim())
    .map(l => (l.match(/^ */) as RegExpMatchArray)[0].length)
  const cut = indents.length ? Math.min(...indents) : 0
  return [lines[0], ...lines.slice(1).map(l => l.slice(cut))].join('\n').trim()
}
