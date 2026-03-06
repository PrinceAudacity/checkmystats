import React, { useState, useEffect, useRef } from 'react'
import { searchNodes } from '../services/api'

export default function SearchBar({ onNodeSelect, graphData }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const timer = setTimeout(() => {
      searchNodes(query).then(setResults).catch(() => setResults([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative w-64">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search skills or careers..."
        className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2
                   border border-gray-600 focus:border-brand-accent outline-none"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-600
                        rounded shadow-xl z-50 max-h-60 overflow-y-auto">
          {results.map(node => (
            <button
              key={node.id}
              onClick={() => { onNodeSelect(node); setOpen(false); setQuery('') }}
              className="block w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors"
            >
              <div className="text-white text-sm">{node.display_name}</div>
              <div className="text-gray-400 text-xs">{node.subject_category}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
