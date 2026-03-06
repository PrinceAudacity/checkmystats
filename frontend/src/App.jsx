import React, { useState, useEffect } from 'react'
import MapCanvas from './components/MapCanvas'
import NodeDetail from './components/NodeDetail'
import SearchBar from './components/SearchBar'
import Legend from './components/Legend'
import { getGraph } from './services/api'

export default function App() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [selectedNode, setSelectedNode] = useState(null)
  const [pathData, setPathData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getGraph()
      .then(data => {
        setGraphData(data)
        setLoading(false)
      })
      .catch(err => {
        setError('Failed to load map data. Is the backend running?')
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-brand-dark">
      <div className="text-white text-xl">Loading CheckMyStats...</div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-brand-dark">
      <div className="text-red-400 text-xl">{error}</div>
    </div>
  )

  return (
    <div className="relative w-screen h-screen bg-brand-dark overflow-hidden">

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center
                      justify-between px-6 py-3 bg-black bg-opacity-40 backdrop-blur-sm">
        <div>
          <span className="text-white font-bold text-xl tracking-wide">CHECK</span>
          <span className="text-brand-accent font-bold text-xl tracking-wide">MYSTATS</span>
          <span className="text-gray-400 text-sm ml-3">Map Your Future</span>
        </div>
        <SearchBar
          onNodeSelect={setSelectedNode}
          graphData={graphData}
        />
      </div>

      {/* Main map canvas */}
      <MapCanvas
        graphData={graphData}
        selectedNode={selectedNode}
        pathData={pathData}
        onNodeClick={setSelectedNode}
      />

      {/* Node detail panel — slides in from right */}
      {selectedNode && (
        <NodeDetail
          node={selectedNode}
          graphData={graphData}
          onClose={() => setSelectedNode(null)}
          onPathFind={setPathData}
          onNodeSelect={setSelectedNode}
        />
      )}

      {/* Legend */}
      <Legend />

    </div>
  )
}
