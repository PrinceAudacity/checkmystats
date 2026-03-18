import React from 'react'

export default function PathInfo({ activePath, selNode }) {
  if (!activePath) return null
  const { nodeSet, edgeSet } = activePath
  const label = selNode ? `${selNode.name}: ` : ''
  return (
    <div className="path-info">
      {label}{nodeSet.size} nodes · {edgeSet.size} edges
    </div>
  )
}
