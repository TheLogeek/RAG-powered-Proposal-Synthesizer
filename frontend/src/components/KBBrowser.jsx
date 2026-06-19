import React, { useEffect, useState } from 'react'

export default function KBBrowser({ highlightedSources = [] }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetch('/api/kb')
      .then(r => r.json())
      .then(data => { setFiles(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const isHighlighted = filename =>
    highlightedSources.some(s => filename.includes(s.source))

  const getScore = filename => {
    const match = highlightedSources.find(s => filename.includes(s.source))
    return match ? match.score : null
  }

  return (
    <aside className="kb-browser">
      <div className="kb-header">
        <span className="kb-label">KNOWLEDGE BASE</span>
        <span className="kb-count">{files.length} docs</span>
      </div>

      {loading && <p className="kb-empty">Loading...</p>}
      {!loading && files.length === 0 && (
        <p className="kb-empty">No documents found in knowledge_base/</p>
      )}

      <ul className="kb-list">
        {files.map(file => {
          const highlighted = isHighlighted(file.filename)
          const score = getScore(file.filename)
          const isOpen = expanded === file.filename

          return (
            <li
              key={file.filename}
              className={`kb-item ${highlighted ? 'kb-item--active' : ''}`}
              onClick={() => setExpanded(isOpen ? null : file.filename)}
            >
              <div className="kb-item-header">
                <span className="kb-item-title">{file.title}</span>
                {score !== null && (
                  <span className="kb-score">{(score * 100).toFixed(0)}%</span>
                )}
              </div>

              {file.tags.length > 0 && (
                <div className="kb-tags">
                  {file.tags.map(tag => (
                    <span key={tag} className="kb-tag">{tag.trim()}</span>
                  ))}
                </div>
              )}

              {isOpen && (
                <p className="kb-preview">{file.preview}</p>
              )}

              <div className="kb-meta">
                <span>{file.word_count} words</span>
                <span>{file.filename}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
