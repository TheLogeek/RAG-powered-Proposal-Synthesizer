import React, { useState, useRef } from 'react'
import { embedQuery, getEmbeddingPipeline } from '../embedQuery.js'
import { saveUserChunks } from '../kbStorage.js'

function chunkText(text, source) {
  const lines = text.split('\n')
  const chunks = []
  let currentHeading = 'Overview'
  let currentLines = []

  const pushChunk = (heading, bodyLines) => {
    const body = bodyLines.join('\n').trim()
    if (body.split(/\s+/).length < 10) return
    chunks.push({
      source,
      chunk_id: `${source}_${chunks.length}`,
      heading,
      text: `[${source} — ${heading}]\n\n${body}`,
      title: source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    })
  }

  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (currentLines.length > 0) pushChunk(currentHeading, currentLines)
      currentHeading = line.replace(/^#\s*/, '').trim()
      currentLines = []
    } else if (line.startsWith('## ')) {
      if (currentLines.length > 0) pushChunk(currentHeading, currentLines)
      currentHeading = line.replace(/^##\s*/, '').trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }
  if (currentLines.length > 0) pushChunk(currentHeading, currentLines)
  return chunks
}

export default function UploadPanel({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleFiles = async (files) => {
    setError('')
    setStatus('')
    setUploading(true)

    try {
      await getEmbeddingPipeline()

      for (const file of files) {
        if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
          setError(`Skipped ${file.name}: only .md and .txt files supported`)
          continue
        }

        setStatus(`Reading ${file.name}...`)
        const text = await file.text()
        const source = file.name.replace(/\.(md|txt)$/i, '')

        setStatus(`Chunking ${file.name}...`)
        const chunks = chunkText(text, source)

        if (chunks.length === 0) {
          setError(`${file.name}: no usable sections found (need 10+ words per section)`)
          continue
        }

        setStatus(`Embedding ${chunks.length} section(s) from ${file.name}...`)
        for (let i = 0; i < chunks.length; i++) {
          const emb = await embedQuery(chunks[i].text)
          chunks[i].embedding = emb
        }

        setStatus(`Saving ${file.name}...`)
        await saveUserChunks(chunks)
      }

      setStatus('Done!')
      if (onUploadComplete) onUploadComplete()
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (uploading) return
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.md') || f.name.endsWith('.txt')
    )
    if (files.length > 0) handleFiles(files)
  }

  const handleDragOver = (e) => e.preventDefault()

  const handleClick = () => inputRef.current?.click()

  const handleInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files))
    }
    e.target.value = ''
  }

  return (
    <div className="upload-panel">
      <div
        className={`upload-zone ${uploading ? 'upload-zone--busy' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".md,.txt"
          multiple
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        <span className="upload-icon">+</span>
        <span className="upload-text">
          {uploading ? status : 'Upload .md or .txt files'}
        </span>
        {error && <span className="upload-error">{error}</span>}
      </div>
    </div>
  )
}
