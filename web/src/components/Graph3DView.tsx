import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d'
import type { MutableRefObject } from 'react'
import { edgeEndId } from '../lib/graph'
import type { GraphData, LinkDatum, NodeDatum, ThemeMode } from '../types/graph'

type Graph3DViewProps = {
  visible: boolean
  theme: ThemeMode
  width: number
  height: number
  graphData: GraphData
  focusedNodeId: string | null
  highlightedNeighbors: Set<string>
  graphRef: MutableRefObject<ForceGraphMethods<NodeDatum, LinkDatum> | undefined>
  onNodeFocusToggle: (node: NodeDatum) => void
  onBackgroundClick: () => void
}

export function Graph3DView({
  visible,
  theme,
  width,
  height,
  graphData,
  focusedNodeId,
  highlightedNeighbors,
  graphRef,
  onNodeFocusToggle,
  onBackgroundClick,
}: Graph3DViewProps) {
  const colors =
    theme === 'dark'
      ? {
          bg: '#0b111b',
          node: '#13b8a6',
          focus: '#ff9f43',
          edge: '#5f7694',
          fadedNode: 'rgba(85, 107, 134, 0.28)',
          fadedEdge: 'rgba(95, 118, 148, 0.15)',
        }
      : {
          bg: '#f4f7fb',
          node: '#0b8b7d',
          focus: '#c96d00',
          edge: '#7e92aa',
          fadedNode: 'rgba(126, 146, 170, 0.3)',
          fadedEdge: 'rgba(126, 146, 170, 0.22)',
        }

  const nodeColor = (node: NodeDatum): string => {
    if (!focusedNodeId) return colors.node
    if (node.id === focusedNodeId) return colors.focus
    if (highlightedNeighbors.has(node.id)) return colors.node
    return colors.fadedNode
  }

  const linkColor = (link: LinkDatum): string => {
    if (!focusedNodeId) return colors.edge
    const sourceId = edgeEndId(link.source)
    const targetId = edgeEndId(link.target)
    return sourceId === focusedNodeId || targetId === focusedNodeId
      ? colors.node
      : colors.fadedEdge
  }

  const linkWidth = (link: LinkDatum): number => {
    if (!focusedNodeId) return 1
    const sourceId = edgeEndId(link.source)
    const targetId = edgeEndId(link.target)
    return sourceId === focusedNodeId || targetId === focusedNodeId ? 2.5 : 0.35
  }

  return (
    <div className={visible ? 'fg-view visible' : 'fg-view hidden'}>
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        width={width}
        height={height}
        backgroundColor={colors.bg}
        controlType="orbit"
        nodeRelSize={4}
        nodeLabel={(node) => (node as NodeDatum).full}
        nodeColor={(node) => nodeColor(node as NodeDatum)}
        linkColor={(link) => linkColor(link as LinkDatum)}
        linkWidth={(link) => linkWidth(link as LinkDatum)}
        linkOpacity={focusedNodeId ? 0.95 : 0.75}
        enableNodeDrag={false}
        enablePointerInteraction
        enableNavigationControls
        showNavInfo
        onNodeClick={(node) => onNodeFocusToggle(node as NodeDatum)}
        onBackgroundClick={onBackgroundClick}
      />
    </div>
  )
}
