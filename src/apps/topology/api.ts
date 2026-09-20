import {
  METRICS_API_URL,
  containerLabel,
  containerState,
  fetchJson,
  type ContainerState,
  type ContainersResponse,
} from '@/apps/metrics-systems/api'

// Container state keyed by compose service, which is what a node id is.
// Null means the metrics API did not answer: the diagram is still worth
// drawing, so the page treats that as "every node unknown" rather than an
// error state.
export async function fetchNodeStates(): Promise<Map<string, ContainerState> | null> {
  const body = await fetchJson<ContainersResponse>(`${METRICS_API_URL}/containers`)
  // fetchJson casts without validating, so a well-formed 200 carrying the
  // wrong shape would throw here and leave the page waiting on a promise
  // nobody rejects — no diagram, and no "status unavailable" either.
  if (!Array.isArray(body?.containers)) return null
  return new Map(
    body.containers.filter(c => c && typeof c.name === 'string').map(c => [containerLabel(c), containerState(c)])
  )
}
