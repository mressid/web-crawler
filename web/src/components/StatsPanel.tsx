import { shortLabel } from '../lib/graph'
import type { NodeStats } from '../types/graph'

type StatsSummary = {
  totalNodes: number
  totalEdges: number
  sourceCount: number
  sinkCount: number
  avgOut: string
  avgIncident: string
}

type StatsPanelProps = {
  summary: StatsSummary
  rows: NodeStats[]
  focusedNodeId: string | null
}

export function StatsPanel({ summary, rows, focusedNodeId }: StatsPanelProps) {
  return (
    <aside
      id="nodeStatsPanel"
      aria-live="polite"
      onWheelCapture={(event) => event.stopPropagation()}
      onTouchMoveCapture={(event) => event.stopPropagation()}
    >
      <h2>Node Statistics</h2>

      <div className="stats-summary">
        <div className="stats-chip">Nodes<strong>{summary.totalNodes}</strong></div>
        <div className="stats-chip">Edges<strong>{summary.totalEdges}</strong></div>
        <div className="stats-chip">Avg out-degree<strong>{summary.avgOut}</strong></div>
        <div className="stats-chip">Avg incident<strong>{summary.avgIncident}</strong></div>
        <div className="stats-chip">Sources (in=0)<strong>{summary.sourceCount}</strong></div>
        <div className="stats-chip">Sinks (out=0)<strong>{summary.sinkCount}</strong></div>
      </div>

      <table id="nodeStatsTable">
        <thead>
          <tr>
            <th>Node</th>
            <th>In</th>
            <th>Out</th>
            <th>Inc</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4}>Load and render a graph to see node statistics.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className={row.id === focusedNodeId ? 'focused-row' : ''}>
                <td>
                  <strong>{shortLabel(row.id)}</strong>
                  <span className="node-url" title={row.id}>
                    {row.id}
                  </span>
                </td>
                <td>{row.inDegree}</td>
                <td>{row.outDegree}</td>
                <td>{row.incidentEdges}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </aside>
  )
}
