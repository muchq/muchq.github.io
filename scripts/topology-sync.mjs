// The topology page's diagram (src/apps/topology/topology.mmd) is a copy of
// the one mermaid block in MoonBase's docs/DEPLOYMENT.md, where deployments
// are documented. `node scripts/topology-sync.mjs` rewrites the copy from
// MoonBase's main; `--check` fails, writing nothing, when the copy differs.
import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const SOURCE = 'https://raw.githubusercontent.com/muchq/MoonBase/main/docs/DEPLOYMENT.md'

// The lines between the doc's one ```mermaid fence and its closing fence.
export function extractDiagram(markdown) {
  const lines = markdown.split('\n')
  const opens = lines.flatMap((line, i) => (line.trim() === '```mermaid' ? [i] : []))
  if (opens.length !== 1) throw new Error(`expected one mermaid block, found ${opens.length}`)
  const close = lines.findIndex((line, i) => i > opens[0] && line.trim() === '```')
  if (close === -1) throw new Error('the mermaid block is unclosed')
  return lines.slice(opens[0] + 1, close).map(line => `${line}\n`).join('')
}

async function main() {
  const response = await fetch(SOURCE)
  if (!response.ok) throw new Error(`${SOURCE}: ${response.status}`)
  const diagram = extractDiagram(await response.text())
  const path = new URL('../src/apps/topology/topology.mmd', import.meta.url)
  const copy = await readFile(path, 'utf8')
  if (copy === diagram) {
    console.log('topology.mmd matches MoonBase docs/DEPLOYMENT.md')
    return
  }
  if (process.argv.includes('--check')) {
    console.error('topology.mmd differs from MoonBase docs/DEPLOYMENT.md: run node scripts/topology-sync.mjs')
    process.exit(1)
  }
  await writeFile(path, diagram)
  console.log('topology.mmd rewritten from MoonBase docs/DEPLOYMENT.md')
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
