import React from 'react'

const layers = [
  { label: 'Foundation', color: '#3A86FF' },
  { label: 'Domain', color: '#06D6A0' },
  { label: 'Professional', color: '#FFB703' },
  { label: 'Career Outcome', color: '#E94560' },
]

export default function Legend() {
  return (
    <div className="absolute bottom-6 left-6 bg-black bg-opacity-60 rounded-lg p-4 z-10">
      <div className="text-gray-400 text-xs uppercase tracking-wider mb-3">Map Layers</div>
      {layers.map(l => (
        <div key={l.label} className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
          <span className="text-white text-xs">{l.label}</span>
        </div>
      ))}
      <div className="border-t border-gray-600 mt-3 pt-3">
        <div className="text-gray-400 text-xs">Click any node to explore</div>
        <div className="text-gray-400 text-xs">→ Plot Path highlights your route</div>
      </div>
    </div>
  )
}
