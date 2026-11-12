import source from './curriculum.md?raw'
export const sections = source.split(/^## /m)
export const introduction = sections[0].replace(/^# .*\n+/, '')
export const guide = sections[1].replace(/^.*\n/, '')
export const references = sections[22].replace(/^.*\n/, '')
export const chapters = sections.slice(2, 22).map(section => {
  const [heading, ...lines] = section.split('\n')
  const body = lines.join('\n')
  const starts = [...body.matchAll(/^\*\*(\d+\.\d+)\.\*\* /gm)]
  return {
    number: Number(heading.split('.')[0]), title: heading.replace(/^\d+\. /, '').replace(/\\([[\]_])/g, '$1'),
    reading: body.slice(0, starts[0].index).trim(),
    problems: starts.map((match, i) => ({ id: match[1], text: body.slice(match.index! + match[0].length, starts[i + 1]?.index ?? body.length).trim() }))
  }
})
