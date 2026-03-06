import React from 'react'

// PathFinder — critical path highlight controller
// Receives a pathData object {path: [], total_hours, node_count}
// and exposes it to the MapCanvas for rendering

export default function PathFinder({ pathData, onClear }) {
  if (!pathData || !pathData.path?.length) return null

  return (
    <div className="absolute bottom-6 right-6 bg-black bg-opacity-70 rounded-lg p-4 z-10 w-64">
      <div className="flex items-center justify-between mb-2">
        <span className="text-brand-green font-bold text-sm uppercase tracking-wider">Path Found</span>
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-white text-xs"
        >
          Clear
        </button>
      </div>
      <div className="text-gray-300 text-xs mb-1">
        {pathData.node_count} steps · {pathData.total_hours}h total
      </div>
      <div className="text-gray-500 text-xs">
        Nodes on path glow green
      </div>
    </div>
  )
}
