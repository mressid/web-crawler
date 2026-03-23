import { useEffect, useRef } from 'react'
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'

import type { LayoutName, ThemeMode } from '../types/graph'

type Graph2DViewProps = {
  visible: boolean
  theme: ThemeMode
  elements: ElementDefinition[]
  layout: LayoutName
  fitToken: number
  focusedNodeId: string | null
  onNodeFocusToggle: (nodeId: string, fullUrl: string) => void
  onCanvasClear: () => void
  onNodeHover: (fullUrl: string) => void
}

export function Graph2DView({
  visible,
  theme,
  elements,
  layout,
  fitToken,
  focusedNodeId,
  onNodeFocusToggle,
  onCanvasClear,
  onNodeHover,
}: Graph2DViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cyRef = useRef<Core | null>(null)

  const getStyles = (currentTheme: ThemeMode): any[] => {
    const palette =
      currentTheme === 'dark'
        ? {
            node: '#13b8a6',
            nodeText: '#d5f2ef',
            outline: '#0c2f37',
            edge: '#4e6889',
            activeEdge: '#13b8a6',
          }
        : {
            node: '#0b8b7d',
            nodeText: '#ecfffc',
            outline: '#1f726c',
            edge: '#9cb0c6',
            activeEdge: '#0b8b7d',
          }

    return [
      {
        selector: 'node',
        style: {
          'background-color': palette.node,
          label: '',
          'font-size': 4,
          'text-wrap': 'ellipsis',
          'text-max-width': '100px',
          color: palette.nodeText,
          'text-outline-width': 2,
          'text-outline-color': palette.outline,
          width: 16,
          height: 16,
        },
      },
      {
        selector: 'node.hover-label, node.focus-label',
        style: {
          label: 'data(label)',
          'font-size': 4,
        },
      },
      {
        selector: 'edge',
        style: {
          width: 1,
          'line-color': palette.edge,
          'target-arrow-color': palette.edge,
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'arrow-scale': 0.7,
          opacity: 0.85,
        },
      },
      {
        selector: '.faded',
        style: {
          opacity: 0.1,
          'text-opacity': 0.1,
        },
      },
      {
        selector: 'edge.faded',
        style: {
          opacity: 0.06,
        },
      },
      {
        selector: '.highlighted',
        style: {
          opacity: 1,
          'text-opacity': 1,
        },
      },
      {
        selector: 'edge.highlighted',
        style: {
          width: 2,
          'line-color': palette.activeEdge,
          'target-arrow-color': palette.activeEdge,
          opacity: 0.95,
        },
      },
    ]
  }

  useEffect(() => {
    if (!containerRef.current || cyRef.current) return

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: getStyles(theme) as any,
    })

    cyRef.current = cy
    return () => {
      cy.destroy()
      cyRef.current = null
    }
  }, [theme])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.style(getStyles(theme) as any)
  }, [theme])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.elements().remove()
    cy.add(elements)

    if (visible) {
      cy.layout({
        name: layout,
        animate: false,
        fit: true,
        padding: 40,
        spacingFactor: 1.1,
        nodeDimensionsIncludeLabels: false,
      }).run()
    }
  }, [elements, layout, visible])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy || !visible) return
    cy.fit(undefined, 40)
  }, [fitToken, visible])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy || !visible) return

    const clearFocus = () => {
      cy.elements().removeClass('faded highlighted focus-label')
    }

    const applyFocus = (nodeId: string) => {
      const node = cy.getElementById(nodeId)
      if (!node || node.empty()) return
      cy.elements().removeClass('faded highlighted focus-label')
      cy.elements().addClass('faded')
      const connectedEdges = node.connectedEdges()
      const relatedNodes = connectedEdges.connectedNodes().union(node)
      relatedNodes.removeClass('faded')
      relatedNodes.addClass('highlighted focus-label')
      connectedEdges.removeClass('faded')
      connectedEdges.addClass('highlighted')
    }

    if (!focusedNodeId) clearFocus()
    else applyFocus(focusedNodeId)
  }, [focusedNodeId, visible])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return

    cy.removeAllListeners()

    cy.on('tap', 'node', (evt) => {
      if (!visible) return
      const id = evt.target.id()
      const full = evt.target.data('full') as string
      onNodeFocusToggle(id, full)
    })

    cy.on('tap', (evt) => {
      if (!visible) return
      if (evt.target === cy) onCanvasClear()
    })

    cy.on('mouseover', 'node', (evt) => {
      if (!visible) return
      const node = evt.target
      node.addClass('hover-label')
      onNodeHover(node.data('full') as string)
    })

    cy.on('mouseout', 'node', (evt) => {
      evt.target.removeClass('hover-label')
    })
  }, [visible, onNodeFocusToggle, onCanvasClear, onNodeHover])

  return <div ref={containerRef} className={visible ? 'cy-view visible' : 'cy-view hidden'} />
}
