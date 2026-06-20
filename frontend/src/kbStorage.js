const DB_NAME = 'proposal-synth-kb'
const DB_VERSION = 1
const STORE_NAME = 'user_chunks'

const DISMISSED_KEY = 'proposal-synth-dismissed'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'chunk_id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveUserChunks(chunks) {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  for (const chunk of chunks) {
    store.put(chunk)
  }
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getUserChunks() {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const all = await new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return all || []
}

export async function deleteUserChunk(chunkId) {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  store.delete(chunkId)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteUserFile(source) {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const all = await new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  const toDelete = all.filter(c => c.source === source).map(c => c.chunk_id)
  for (const id of toDelete) {
    store.delete(id)
  }
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getUserFileMeta() {
  const chunks = await getUserChunks()
  const fileMap = {}
  for (const c of chunks) {
    if (!fileMap[c.source]) {
      fileMap[c.source] = { source: c.source, chunk_count: 0, title: c.title || c.source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
    }
    fileMap[c.source].chunk_count++
  }
  return Object.values(fileMap)
}

export function getDismissedSources() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function dismissSource(source) {
  const current = getDismissedSources()
  if (!current.includes(source)) {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...current, source]))
  }
}

export function undismissSource(source) {
  const current = getDismissedSources()
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(current.filter(s => s !== source)))
}
