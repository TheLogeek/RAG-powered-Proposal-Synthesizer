import React, { useRef, useEffect } from 'react'

export default function ProposalOutput({ proposal, status, sources }) {
  const textRef = useRef(null)

  // Auto-scroll as tokens stream in
  useEffect(() => {
    if (textRef.current && status === 'streaming') {
      textRef.current.scrollTop = textRef.current.scrollHeight
    }
  }, [proposal, status])

  const handleCopy = () => {
    if (proposal) navigator.clipboard.writeText(proposal)
  }

  const isEmpty = !proposal && status === 'idle'
  const isEmbedding = status === 'embedding'

  return (
    <div className="output-panel">
      <div className="output-header">
        <span className="panel-label">GENERATED PROPOSAL</span>
        <div className="output-actions">
          {status === 'streaming' && (
            <span className="streaming-indicator">
              <span className="pulse-dot" />
              Streaming
            </span>
          )}
          {status === 'done' && (
            <button className="copy-btn" onClick={handleCopy}>
              Copy
            </button>
          )}
        </div>
      </div>

      <div className="output-body" ref={textRef}>
        {isEmpty && (
          <div className="output-empty">
            <div className="empty-icon">⟡</div>
            <p>Your proposal will appear here.</p>
            <p className="empty-sub">
              Paste a job description and hit Generate — the system will retrieve
              the most relevant portfolio context and stream a targeted proposal.
            </p>
          </div>
        )}

        {isEmbedding && (
          <div className="output-empty">
            <div className="embed-status">
              <span className="spinner spinner--large" />
              <p>Loading embedding model<span className="ellipsis-anim">...</span></p>
              <p className="empty-sub">First run downloads ~23 MB (cached after)</p>
            </div>
          </div>
        )}

        {proposal && (
          <pre className="proposal-text">{proposal}</pre>
        )}
      </div>

      {sources.length > 0 && (
        <div className="sources-bar">
          <span className="sources-label">RETRIEVED FROM</span>
          {sources.map(s => (
            <span key={s.source} className="source-chip">
              {s.source}
              <span className="source-score">{(s.score * 100).toFixed(0)}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
