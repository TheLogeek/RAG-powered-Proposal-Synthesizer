import React, { useState } from 'react'
import KBBrowser from './components/KBBrowser.jsx'
import JobInputPanel from './components/JobInputPanel.jsx'
import ProposalOutput from './components/ProposalOutput.jsx'
import './app.css'

export default function App() {
  const [proposal, setProposal] = useState('')
  const [status, setStatus] = useState('idle') // idle | embedding | streaming | done | error
  const [sources, setSources] = useState([])
  const [error, setError] = useState(null)

  const handleGenerate = async (jobDescription) => {
    setProposal('')
    setSources([])
    setError(null)
    setStatus('embedding')

    let embedding
    try {
      const { embedQuery } = await import('./embedQuery.js')
      embedding = await embedQuery(jobDescription)
    } catch (e) {
      setError('Failed to load embedding model: ' + e.message)
      setStatus('error')
      return
    }

    setStatus('streaming')

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jobDescription,
          query_embedding: embedding,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'API error')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line

        for (const line of lines) {
          if (line.startsWith('event: sources')) continue
          if (line.startsWith('event: token')) continue
          if (line.startsWith('event: done')) {
            setStatus('done')
            continue
          }
          if (line.startsWith('event: error')) continue

          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim()
            if (!raw) continue
            try {
              const parsed = JSON.parse(raw)
              // sources event payload is an array
              if (Array.isArray(parsed)) {
                setSources(parsed)
              } else if (typeof parsed === 'string') {
                // token
                setProposal(prev => prev + parsed)
              }
            } catch {
              // non-JSON data line, skip
            }
          }
        }
      }
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo-mark">⟡</span>
          <span className="logo-text">ProposalSynth</span>
          <span className="logo-sub">RAG-powered · Groq-llama-3.1-8b-instant</span>
        </div>
        <div className="topbar-right">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-link"
          >
            GitHub
          </a>
        </div>
      </header>

      <main className="dashboard">
        <KBBrowser highlightedSources={sources} />

        <div className="center-col">
          <JobInputPanel
            onGenerate={handleGenerate}
            isGenerating={status === 'embedding' || status === 'streaming'}
          />

          {error && (
            <div className="error-banner">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <ProposalOutput
          proposal={proposal}
          status={status}
          sources={sources}
        />
      </main>
    </div>
  )
}
