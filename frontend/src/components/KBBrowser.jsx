import React, { useEffect, useState, useCallback } from 'react'
import { getDismissedSources, dismissSource, undismissSource, getUserFileMeta, deleteUserFile } from '../kbStorage.js'
import UploadPanel from './UploadPanel.jsx'

export default function KBBrowser({ highlightedSources = [] }) {
  const [builtinFiles, setBuiltinFiles] = useState([])
  const [userFiles, setUserFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [dismissed, setDismissed] = useState(getDismissedSources)

  const refresh = useCallback(() => {
    setDismissed(getDismissedSources())
    getUserFileMeta().then(setUserFiles)
  }, [])

  useEffect(() => {
    fetch('/api/kb')
      .then(r => r.json())
      .then(data => { setBuiltinFiles(data); setLoading(false) })
      .catch(() => setLoading(false))
    getUserFileMeta().then(setUserFiles)
  }, [])

  const isHighlighted = filename =>
    highlightedSources.some(s => filename.includes(s.source))

  const getScore = filename => {
    const match = highlightedSources.find(s => filename.includes(s.source))
    return match ? match.score : null
  }

  const handleDismiss = (e, filename) => {
    e.stopPropagation()
    dismissSource(filename)
    setDismissed(getDismissedSources())
  }

  const handleUndismiss = (e, filename) => {
    e.stopPropagation()
    undismissSource(filename)
    setDismissed(getDismissedSources())
  }

  const handleDeleteUserFile = async (e, source) => {
    e.stopPropagation()
    await deleteUserFile(source)
    refresh()
  }

  const handleUploadComplete = () => {
    refresh()
  }

  const visibleBuiltin = builtinFiles.filter(f => !dismissed.includes(f.filename))
  const dismissedBuiltin = builtinFiles.filter(f => dismissed.includes(f.filename))
  const hasDismissed = dismissedBuiltin.length > 0

  const renderItem = (file, { isUserFile = false, isDismissed = false } = {}) => {
    const highlighted = isHighlighted(file.filename || file.source)
    const score = getScore(file.filename || file.source)
    const isOpen = expanded === (file.filename || file.source)

    return (
      <li
        key={file.filename || file.source}
        className={`kb-item ${highlighted ? 'kb-item--active' : ''} ${isDismissed ? 'kb-item--dismissed' : ''}`}
        onClick={() => setExpanded(isOpen ? null : (file.filename || file.source))}
      >
        <div className="kb-item-header">
          <span className="kb-item-title">{file.title || file.source}</span>
          <div className="kb-item-actions">
            {score !== null && (
              <span className="kb-score">{(score * 100).toFixed(0)}%</span>
            )}
            {isUserFile ? (
              <button
                className="kb-dismiss-btn"
                onClick={(e) => handleDeleteUserFile(e, file.source)}
                title="Remove this file"
              >
                ✕
              </button>
            ) : isDismissed ? (
              <button
                className="kb-restore-btn"
                onClick={(e) => handleUndismiss(e, file.filename)}
                title="Restore this file"
              >
                ↺
              </button>
            ) : (
              <button
                className="kb-dismiss-btn"
                onClick={(e) => handleDismiss(e, file.filename)}
                title="Hide this file from retrieval"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {file.tags && file.tags.length > 0 && (
          <div className="kb-tags">
            {file.tags.map(tag => (
              <span key={tag} className="kb-tag">{tag.trim()}</span>
            ))}
          </div>
        )}

        {isOpen && file.preview && (
          <p className="kb-preview">{file.preview}</p>
        )}
        {isOpen && isUserFile && (
          <p className="kb-preview">{file.chunk_count} section(s)</p>
        )}

        <div className="kb-meta">
          {file.word_count ? <span>{file.word_count} words</span> : <span />}
          <span>{file.filename || file.source}</span>
        </div>
      </li>
    )
  }

  return (
    <aside className="kb-browser">
      <div className="kb-header">
        <span className="kb-label">KNOWLEDGE BASE</span>
        <span className="kb-count">{visibleBuiltin.length + userFiles.length} docs</span>
      </div>

      <UploadPanel onUploadComplete={handleUploadComplete} />

      <ul className="kb-list">
        {loading && <p className="kb-empty">Loading...</p>}

        {!loading && visibleBuiltin.length === 0 && userFiles.length === 0 && !hasDismissed && (
          <p className="kb-empty">No documents found in knowledge_base/</p>
        )}

        {userFiles.length > 0 && (
          <>
            <li className="kb-section-label">Your Uploads</li>
            {userFiles.map(f => renderItem(f, { isUserFile: true }))}
          </>
        )}

        {visibleBuiltin.length > 0 && (
          <>
            {userFiles.length > 0 && <li className="kb-section-label">Built-in</li>}
            {visibleBuiltin.map(f => renderItem(f))}
          </>
        )}

        {hasDismissed && (
          <>
            <li
              className="kb-section-label kb-section-label--dismissed"
              onClick={() => setExpanded(expanded === '__dismissed__' ? null : '__dismissed__')}
            >
              Dismissed ({dismissedBuiltin.length})
              <span className="kb-section-toggle">{expanded === '__dismissed__' ? '−' : '+'}</span>
            </li>
            {expanded === '__dismissed__' && dismissedBuiltin.map(f => renderItem(f, { isDismissed: true }))}
          </>
        )}
      </ul>
    </aside>
  )
}
