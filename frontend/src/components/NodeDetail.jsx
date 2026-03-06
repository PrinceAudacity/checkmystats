import React, { useState } from 'react'
import { getPath } from '../services/api'

const LAYER_LABELS = {
  1: 'Foundation',
  2: 'Domain',
  3: 'Professional',
  4: 'Career Outcome',
}

const LAYER_COLORS = {
  1: 'text-blue-400',
  2: 'text-green-400',
  3: 'text-yellow-400',
  4: 'text-red-400',
}

export default function NodeDetail({ node, graphData, onClose, onPathFind, onNodeSelect }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const prerequisites = graphData.nodes.filter(n =>
    node.prerequisite_ids?.includes(n.id)
  )

  const unlocks = graphData.nodes.filter(n =>
    node.unlocks_ids?.includes(n.id)
  )

  const handlePathFind = async () => {
    // Find path from counting (root) to this node
    const rootId = 'math_counting'
    setLoading(true)
    setError(null)
    try {
      const result = await getPath(rootId, node.id)
      onPathFind(result)
    } catch (e) {
      setError('No path found from root to this node.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900 bg-opacity-95
                    border-l border-gray-700 overflow-y-auto z-20 p-5">

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider ${LAYER_COLORS[node.layer]}`}>
            {LAYER_LABELS[node.layer]}
          </span>
          <h2 className="text-white text-lg font-bold mt-1">{node.display_name}</h2>
          <span className="text-gray-400 text-xs">{node.subject_category}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl ml-2">×</button>
      </div>

      {/* Summary */}
      <p className="text-gray-300 text-sm leading-relaxed mb-4">{node.summary}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {node.time_estimate_hours && (
          <div className="bg-gray-800 rounded p-3">
            <div className="text-gray-400 text-xs">Time to master</div>
            <div className="text-white font-bold">{node.time_estimate_hours}h</div>
          </div>
        )}
        {node.assessment_count && (
          <div className="bg-gray-800 rounded p-3">
            <div className="text-gray-400 text-xs">Assessments</div>
            <div className="text-white font-bold">{node.assessment_count}</div>
          </div>
        )}
      </div>

      {/* Mastery threshold */}
      {node.mastery_threshold && (
        <div className="bg-gray-800 rounded p-3 mb-4">
          <div className="text-gray-400 text-xs mb-1">Mastery means</div>
          <div className="text-gray-200 text-sm">{node.mastery_threshold}</div>
        </div>
      )}

      {/* Prerequisites */}
      {prerequisites.length > 0 && (
        <div className="mb-4">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Requires first</div>
          {prerequisites.map(p => (
            <button
              key={p.id}
              onClick={() => onNodeSelect(p)}
              className="block w-full text-left text-sm text-blue-300 hover:text-white
                         bg-gray-800 hover:bg-gray-700 rounded px-3 py-2 mb-1 transition-colors"
            >
              {p.display_name}
            </button>
          ))}
        </div>
      )}

      {/* Unlocks */}
      {unlocks.length > 0 && (
        <div className="mb-4">
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Unlocks</div>
          {unlocks.map(u => (
            <button
              key={u.id}
              onClick={() => onNodeSelect(u)}
              className="block w-full text-left text-sm text-green-300 hover:text-white
                         bg-gray-800 hover:bg-gray-700 rounded px-3 py-2 mb-1 transition-colors"
            >
              {u.display_name}
            </button>
          ))}
        </div>
      )}

      {/* Pathfinder button */}
      <button
        onClick={handlePathFind}
        disabled={loading}
        className="w-full bg-brand-accent hover:bg-red-600 disabled:opacity-50
                   text-white font-bold py-3 rounded transition-colors"
      >
        {loading ? 'Finding path...' : '→ Plot path to here'}
      </button>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
