import React, { useState } from 'react'

export default function JobInputPanel({ onGenerate, isGenerating }) {
  const [jd, setJd] = useState('')

  const handleSubmit = () => {
    if (!jd.trim() || isGenerating) return
    onGenerate(jd.trim())
  }

  const wordCount = jd.trim() ? jd.trim().split(/\s+/).length : 0

  return (
    <div className="input-panel">
      <div className="input-panel-header">
        <span className="panel-label">JOB DESCRIPTION</span>
        <span className="word-count">{wordCount} words</span>
      </div>

      <textarea
        className="jd-textarea"
        placeholder="Paste the full job description here — the more technical detail, the better the retrieval..."
        value={jd}
        onChange={e => setJd(e.target.value)}
        disabled={isGenerating}
      />

      <div className="input-panel-footer">
        <div className="model-badge">
          <span className="model-dot" />
          claude-sonnet-4-6
        </div>
        <button
          className={`generate-btn ${isGenerating ? 'generate-btn--loading' : ''}`}
          onClick={handleSubmit}
          disabled={!jd.trim() || isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="spinner" />
              Synthesizing...
            </>
          ) : (
            'Generate Proposal →'
          )}
        </button>
      </div>
    </div>
  )
}
