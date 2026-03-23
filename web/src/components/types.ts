import type { NodeStats } from '../types/graph'

export type StatsSummary = {
  totalNodes: number
  totalEdges: number
  sourceCount: number
  sinkCount: number
  avgOut: string
  avgIncident: string
}

export type StatsPanelRow = NodeStats
