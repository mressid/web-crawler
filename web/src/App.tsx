import { useEffect, useMemo, useRef, useState } from 'react'
import type { ElementDefinition } from 'cytoscape'
import type { ForceGraphMethods } from 'react-force-graph-3d'

import './App.css'
import { Graph2DView } from './components/Graph2DView'
import { Graph3DView } from './components/Graph3DView'
import { StatsPanel } from './components/StatsPanel'
import { Toolbar } from './components/Toolbar'
import { calculateNeighborMap, calculateNodeStats, edgeEndId, shortLabel, toElements } from './lib/graph'
import type { GraphData, LayoutName, LinkDatum, Mode, NodeDatum, NodeStats, ThemeMode } from './types/graph'
import { EMPTY_GRAPH } from './types/graph'

// OrbitControls action codes: 0=ROTATE, 1=DOLLY, 2=PAN
const ORBIT_ACTION = {
  ROTATE: 0,
  DOLLY: 1,
  PAN: 2,
} as const

function App() {
  const [mode, setMode] = useState<Mode>('2d')
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [handToolActive, setHandToolActive] = useState(false)
  const [layout, setLayout] = useState<LayoutName>('cose')
  const [maxNodes, setMaxNodes] = useState<number>(500)
  const [status, setStatus] = useState('Load a JSON file to begin.')
  const [isWarn, setIsWarn] = useState(false)

  const [rawData, setRawData] = useState<unknown | null>(null)
  const [activeGraphData, setActiveGraphData] = useState<GraphData>(EMPTY_GRAPH)
  const [activeElements, setActiveElements] = useState<ElementDefinition[]>([])
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [fitToken, setFitToken] = useState(0)
  const [neighborMap, setNeighborMap] = useState<Map<string, Set<string>>>(new Map())
  const [nodeStatsMap, setNodeStatsMap] = useState<Map<string, NodeStats>>(new Map())

  const graph3dRef = useRef<ForceGraphMethods<NodeDatum, LinkDatum> | undefined>(undefined)
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: Math.max(320, window.innerHeight - 74),
  }))

  useEffect(() => {
    const onResize = () => {
      setViewport({
        width: window.innerWidth,
        height: Math.max(320, window.innerHeight - 74),
      })
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    setNeighborMap(calculateNeighborMap(activeGraphData))
    setNodeStatsMap(calculateNodeStats(activeGraphData))
  }, [activeGraphData])

  useEffect(() => {
    if (mode !== '3d' || !graph3dRef.current) return

    const controls = graph3dRef.current.controls() as {
      enableDamping?: boolean
      dampingFactor?: number
      rotateSpeed?: number
      zoomSpeed?: number
      panSpeed?: number
      enableRotate?: boolean
      enablePan?: boolean
      enableZoom?: boolean
      mouseButtons?: { LEFT?: number; MIDDLE?: number; RIGHT?: number }
      update?: () => void
    }

    controls.enableRotate = !handToolActive
    controls.enablePan = true
    controls.enableZoom = true
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.8
    controls.zoomSpeed = 0.9
    controls.panSpeed = 0.7

    if (controls.mouseButtons) {
      controls.mouseButtons.LEFT = handToolActive ? ORBIT_ACTION.PAN : ORBIT_ACTION.ROTATE
      controls.mouseButtons.RIGHT = handToolActive ? ORBIT_ACTION.ROTATE : ORBIT_ACTION.PAN
      controls.mouseButtons.MIDDLE = ORBIT_ACTION.DOLLY
    }

    controls.update?.()
  }, [mode, activeGraphData, handToolActive])

  const focusStats = useMemo(() => {
    const totalNodes = activeGraphData.nodes.length
    const totalEdges = activeGraphData.links.length
    if (!focusedNodeId) {
      return `Focus: none | Total nodes: ${totalNodes} | Total edges: ${totalEdges}`
    }

    let inDegree = 0
    let outDegree = 0
    let incident = 0
    const neighbors = new Set<string>()

    for (const link of activeGraphData.links) {
      const sourceId = edgeEndId(link.source)
      const targetId = edgeEndId(link.target)
      const isOut = sourceId === focusedNodeId
      const isIn = targetId === focusedNodeId

      if (isOut) {
        outDegree += 1
        if (targetId) neighbors.add(targetId)
      }

      if (isIn) {
        inDegree += 1
        if (sourceId) neighbors.add(sourceId)
      }

      if (isOut || isIn) incident += 1
    }

    neighbors.delete(focusedNodeId)

    return `Focus: ${shortLabel(focusedNodeId)} | in: ${inDegree} | out: ${outDegree} | incident: ${incident} | neighbors: ${neighbors.size}`
  }, [activeGraphData, focusedNodeId])

  const statsSummary = useMemo(() => {
    const entries = Array.from(nodeStatsMap.values())
    const totalNodes = activeGraphData.nodes.length
    const totalEdges = activeGraphData.links.length
    const sourceCount = entries.filter((entry) => entry.inDegree === 0).length
    const sinkCount = entries.filter((entry) => entry.outDegree === 0).length
    const avgOut = totalNodes ? (totalEdges / totalNodes).toFixed(2) : '0.00'
    const avgIncident = totalNodes
      ? (entries.reduce((sum, entry) => sum + entry.incidentEdges, 0) / totalNodes).toFixed(2)
      : '0.00'

    return { totalNodes, totalEdges, sourceCount, sinkCount, avgOut, avgIncident }
  }, [activeGraphData, nodeStatsMap])

  const rankedNodeStats = useMemo(() => {
    return Array.from(nodeStatsMap.values())
      .sort((a, b) => {
        if (b.incidentEdges !== a.incidentEdges) return b.incidentEdges - a.incidentEdges
        return a.id.localeCompare(b.id)
      })
      .slice(0, 20)
  }, [nodeStatsMap])

  const highlightedNeighbors = useMemo(
    () => (focusedNodeId ? neighborMap.get(focusedNodeId) ?? new Set<string>() : new Set<string>()),
    [focusedNodeId, neighborMap]
  )

  const fitGraph = () => {
    setFitToken((prev) => prev + 1)
    if (mode === '3d') {
      graph3dRef.current?.zoomToFit(450, 40)
    }
  }

  const renderGraph = () => {
    if (!rawData) {
      setStatus('Please pick a JSON file first.')
      setIsWarn(true)
      return
    }

    try {
      const result = toElements(rawData, maxNodes)
      setActiveElements(result.elements)
      setActiveGraphData(result.graphData)
      setFocusedNodeId(null)

      const trimmed = result.nodeCount < result.fullNodeCount
      setStatus(
        `Rendered (${mode.toUpperCase()}) ${result.nodeCount}/${result.fullNodeCount} nodes, ` +
          `${result.edgeCount}/${result.fullEdgeCount} edges.` +
          (trimmed ? ' Increase Max nodes to see more.' : '')
      )
      setIsWarn(false)

      if (mode === '3d') {
        window.setTimeout(() => graph3dRef.current?.zoomToFit(450, 40), 260)
      }
    } catch (error) {
      setStatus(`Render error: ${(error as Error).message}`)
      setIsWarn(true)
    }
  }

  return (
    <div className="app-shell">
      <Toolbar
        mode={mode}
        theme={theme}
        handToolActive={handToolActive}
        layout={layout}
        maxNodes={maxNodes}
        focusStats={focusStats}
        status={status}
        isWarn={isWarn}
        onModeChange={(nextMode) => {
          setMode(nextMode)
          setFocusedNodeId(null)
          if (nextMode !== '3d') {
            setHandToolActive(false)
          }
          if (nextMode === '3d') {
            setStatus('3D mode active. Drag to rotate, wheel to zoom, right-drag to pan.')
            setIsWarn(false)
            window.setTimeout(() => graph3dRef.current?.zoomToFit(450, 40), 260)
          }
        }}
        onLayoutChange={setLayout}
        onMaxNodesChange={setMaxNodes}
        onFileChange={(file) => {
          const reader = new FileReader()
          reader.onload = () => {
            try {
              const parsed = JSON.parse(String(reader.result))
              setRawData(parsed)
              setActiveGraphData(EMPTY_GRAPH)
              setActiveElements([])
              setFocusedNodeId(null)
              setStatus(`Loaded ${file.name}. Click Render.`)
              setIsWarn(false)
            } catch (error) {
              setStatus(`Invalid JSON: ${(error as Error).message}`)
              setIsWarn(true)
            }
          }

          reader.onerror = () => {
            setStatus('Could not read file.')
            setIsWarn(true)
          }

          reader.readAsText(file)
        }}
        onToggleTheme={() => {
          setTheme((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark'
            setStatus(`Theme switched to ${next}.`)
            setIsWarn(false)
            return next
          })
        }}
        onToggleHandTool={() => {
          if (mode !== '3d') return
          setHandToolActive((prev) => {
            const next = !prev
            setStatus(next ? 'Hand tool active: drag to pan. Right-drag rotates.' : 'Rotate tool active: drag to rotate. Right-drag pans.')
            setIsWarn(false)
            return next
          })
        }}
        onRender={renderGraph}
        onFit={fitGraph}
      />

      <main className="graph-stage">
        <Graph2DView
          visible={mode === '2d'}
          theme={theme}
          elements={activeElements}
          layout={layout}
          fitToken={fitToken}
          focusedNodeId={focusedNodeId}
          onNodeFocusToggle={(nodeId, full) => {
            setFocusedNodeId((prev) => (prev === nodeId ? null : nodeId))
            setStatus(`Focused (2D): ${full}`)
            setIsWarn(false)
          }}
          onCanvasClear={() => {
            setFocusedNodeId(null)
            setStatus('2D focus cleared.')
            setIsWarn(false)
          }}
          onNodeHover={(full) => {
            setStatus(`Hover (2D): ${full}`)
            setIsWarn(false)
          }}
        />

        <Graph3DView
          visible={mode === '3d'}
          theme={theme}
          width={viewport.width}
          height={viewport.height}
          graphData={activeGraphData}
          focusedNodeId={focusedNodeId}
          highlightedNeighbors={highlightedNeighbors}
          graphRef={graph3dRef}
          onNodeFocusToggle={(node) => {
            setFocusedNodeId((prev) => {
              if (prev === node.id) {
                setStatus('3D focus cleared.')
                setIsWarn(false)
                return null
              }
              setStatus(`Focused (3D): ${node.full}`)
              setIsWarn(false)
              return node.id
            })
          }}
          onBackgroundClick={() => {
            setFocusedNodeId(null)
            setStatus('3D focus cleared.')
            setIsWarn(false)
          }}
        />

        <StatsPanel summary={statsSummary} rows={rankedNodeStats} focusedNodeId={focusedNodeId} />
      </main>
    </div>
  )
}

export default App
