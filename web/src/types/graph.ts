import type { ElementDefinition } from 'cytoscape'

export type Mode = '2d' | '3d'

export type ThemeMode = 'dark' | 'light'

export type LayoutName = 'cose' | 'breadthfirst' | 'concentric' | 'circle' | 'grid'

export type NodeDatum = {
  id: string
  label: string
  full: string
}

export type LinkDatum = {
  id?: string
  source: string | NodeDatum
  target: string | NodeDatum
}

export type GraphData = {
  nodes: NodeDatum[]
  links: LinkDatum[]
}

export type RenderResult = {
  elements: ElementDefinition[]
  graphData: GraphData
  nodeCount: number
  edgeCount: number
  fullNodeCount: number
  fullEdgeCount: number
}

export type NodeStats = {
  id: string
  inDegree: number
  outDegree: number
  incidentEdges: number
  neighbors: Set<string>
}

export const EMPTY_GRAPH: GraphData = { nodes: [], links: [] }
