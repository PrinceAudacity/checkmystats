import React, { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'

// Layer colors matching spec document
const LAYER_COLORS = {
  1: '#3A86FF',   // Foundation — blue
  2: '#06D6A0',   // Domain — green
  3: '#FFB703',   // Professional — yellow
  4: '#E94560',   // Outcome — red/accent
}

const NODE_RADIUS = {
  1: 8,
  2: 10,
  3: 13,
  4: 16,
}

export default function MapCanvas({ graphData, selectedNode, pathData, onNodeClick }) {
  const svgRef = useRef(null)
  const simulationRef = useRef(null)

  const draw = useCallback(() => {
    if (!graphData.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = window.innerWidth
    const height = window.innerHeight

    svg.attr('width', width).attr('height', height)

    // Zoom behavior
    const zoomGroup = svg.append('g').attr('class', 'zoom-group')
    svg.call(
      d3.zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => zoomGroup.attr('transform', event.transform))
    )

    // Start centered
    svg.call(
      d3.zoom().transform,
      d3.zoomIdentity.translate(width / 2, height / 2)
    )

    // Build node and edge maps
    const nodeById = Object.fromEntries(graphData.nodes.map(n => [n.id, n]))
    const pathSet = new Set(pathData?.path || [])

    // Use seed x/y if available, otherwise force layout
    const nodes = graphData.nodes.map(n => ({
      ...n,
      x: n.x != null ? n.x : Math.random() * width,
      y: n.y != null ? n.y : Math.random() * height,
      fx: n.x != null ? n.x : null,
      fy: n.y != null ? n.y : null,
    }))

    const edges = graphData.edges
      .filter(e => e.type === 'prerequisite')
      .map(e => ({
        source: e.source,
        target: e.target,
      }))

    // Force simulation — used when x/y not seeded
    simulationRef.current = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('y', d3.forceY(d => (5 - d.layer) * 160).strength(0.4))

    // Draw edges
    const link = zoomGroup.append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('class', d => {
        if (pathSet.size === 0) return 'link'
        const sourceOnPath = pathSet.has(typeof d.source === 'object' ? d.source.id : d.source)
        const targetOnPath = pathSet.has(typeof d.target === 'object' ? d.target.id : d.target)
        return sourceOnPath && targetOnPath ? 'link highlighted' : 'link dimmed'
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .attr('marker-end', 'url(#arrow)')

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#ffffff')
      .attr('opacity', 0.4)

    // Draw nodes
    const node = zoomGroup.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', d => {
        if (pathSet.size === 0) return 'node'
        if (pathSet.has(d.id)) return 'node on-path'
        return 'node dimmed'
      })
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulationRef.current.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulationRef.current.alphaTarget(0)
          })
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        onNodeClick(d)
      })

    node.append('circle')
      .attr('r', d => NODE_RADIUS[d.layer] || 8)
      .attr('fill', d => LAYER_COLORS[d.layer] || '#888')
      .attr('stroke', d => selectedNode?.id === d.id ? '#ffffff' : 'transparent')
      .attr('stroke-width', 2)

    node.append('text')
      .attr('dy', d => -(NODE_RADIUS[d.layer] || 8) - 4)
      .attr('text-anchor', 'middle')
      .text(d => d.display_name)
      .style('font-size', d => d.layer === 4 ? '12px' : '10px')
      .style('font-weight', d => d.layer === 4 ? 'bold' : 'normal')

    // Tick
    simulationRef.current.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

  }, [graphData, selectedNode, pathData, onNodeClick])

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  return <svg ref={svgRef} className="absolute inset-0" />
}
