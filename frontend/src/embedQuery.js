/**
 * embedQuery.js
 *
 * Runs all-MiniLM-L6-v2 directly in the browser via @xenova/transformers (WASM).
 * This means:
 *  - The same model used for indexing (scripts/build_index.py) is used at query time
 *  - No embedding API cost, no latency roundtrip for the embed step
 *  - First call downloads ~23 MB model (cached in IndexedDB afterwards)
 *
 * The Vercel /api/generate endpoint receives the float32 embedding array and
 * does cosine similarity server-side with numpy.
 */

let pipeline = null

export async function embedQuery(text) {
  if (!pipeline) {
    // Dynamic import — tree-shaken out of non-embedding code paths
    const { pipeline: createPipeline, env } = await import(
      'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js'
    )
    // Use WASM backend; disable remote model fetching except for CDN
    env.allowRemoteModels = true
    env.useBrowserCache = true
    pipeline = await createPipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true }
    )
  }

  const output = await pipeline(text, { pooling: 'mean', normalize: true })
  // output.data is a Float32Array; convert to plain Array for JSON serialisation
  return Array.from(output.data)
}
