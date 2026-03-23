import type { ElementDefinition } from 'cytoscape'
import type { GraphData, LinkDatum, NodeDatum, NodeStats, RenderResult } from '../types/graph'

export function shortLabel(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : parsed.hostname
  } catch {
    return String(url)
  }
}

export function edgeEndId(end: string | NodeDatum): string | null {
  if (typeof end === 'string') return end
  if (end && typeof end === 'object' && 'id' in end) return end.id
  return null
}

export function toElements(payload: unknown, maxNodes: number): RenderResult {
  const adjacency = (payload as { graph?: Record<string, unknown> })?.graph
  if (!adjacency || typeof adjacency !== 'object') {
    throw new Error("Invalid JSON: missing 'graph' object.")
  }

  const nodes = new Set<string>()
  const edges: Array<{ source: string; target: string }> = []

  for (const [source, targets] of Object.entries(adjacency)) {
    nodes.add(source)
    if (!Array.isArray(targets)) continue
    for (const target of targets) {
      if (typeof target !== 'string') continue
      nodes.add(target)
      edges.push({ source, target })
    }
  }

  const limitedNodes = Array.from(nodes).slice(0, Math.max(1, maxNodes))
  const allowed = new Set(limitedNodes)

  const graphNodes: NodeDatum[] = limitedNodes.map((id) => ({
    id,
    label: shortLabel(id),
    full: id,
  }))

  const graphLinks: LinkDatum[] = edges
    .filter((edge) => allowed.has(edge.source) && allowed.has(edge.target))
    .map((edge, index) => ({
      id: `e-${index}`,
      source: edge.source,
      target: edge.target,
    }))

  const elements: ElementDefinition[] = [
    ...graphNodes.map((node) => ({ data: node })),
    ...graphLinks.map((link) => ({
      data: {
        id: link.id,
        source: edgeEndId(link.source),
        target: edgeEndId(link.target),
      },
    })),
  ]

  return {
    elements,
    graphData: {
      nodes: graphNodes,
      links: graphLinks,
    },
    nodeCount: graphNodes.length,
    edgeCount: graphLinks.length,
    fullNodeCount: nodes.size,
    fullEdgeCount: edges.length,
  }
}

export function calculateNeighborMap(graphData: GraphData): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const node of graphData.nodes) {
    map.set(node.id, new Set())
  }
  for (const link of graphData.links) {
    const sourceId = edgeEndId(link.source)
    const targetId = edgeEndId(link.target)
    if (!sourceId || !targetId) continue
    if (!map.has(sourceId)) map.set(sourceId, new Set())
    if (!map.has(targetId)) map.set(targetId, new Set())
    map.get(sourceId)!.add(targetId)
    map.get(targetId)!.add(sourceId)
  }
  return map
}

export function calculateNodeStats(graphData: GraphData): Map<string, NodeStats> {
  const stats = new Map<string, NodeStats>()

  for (const node of graphData.nodes) {
    stats.set(node.id, {
      id: node.id,
      inDegree: 0,
      outDegree: 0,
      incidentEdges: 0,
      neighbors: new Set<string>(),
    })
  }

  for (const link of graphData.links) {
    const sourceId = edgeEndId(link.source)
    const targetId = edgeEndId(link.target)
    if (!sourceId || !targetId) continue

    if (!stats.has(sourceId)) {
      stats.set(sourceId, {
        id: sourceId,
        inDegree: 0,
        outDegree: 0,
        incidentEdges: 0,
        neighbors: new Set<string>(),
      })
    }

    if (!stats.has(targetId)) {
      stats.set(targetId, {
        id: targetId,
        inDegree: 0,
        outDegree: 0,
        incidentEdges: 0,
        neighbors: new Set<string>(),
      })
    }

    const sourceStats = stats.get(sourceId)!
    const targetStats = stats.get(targetId)!

    sourceStats.outDegree += 1
    targetStats.inDegree += 1
    sourceStats.incidentEdges += 1
    targetStats.incidentEdges += 1
    sourceStats.neighbors.add(targetId)
    targetStats.neighbors.add(sourceId)
  }

  return stats
}
