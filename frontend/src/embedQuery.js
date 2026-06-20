let pipeline = null
let pipelinePromise = null

export async function getEmbeddingPipeline() {
  if (pipeline) return pipeline
  if (pipelinePromise) return pipelinePromise
  pipelinePromise = (async () => {
    const { pipeline: createPipeline, env } = await import(
      'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js'
    )
    env.allowRemoteModels = true
    env.useBrowserCache = true
    pipeline = await createPipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { quantized: true }
    )
    return pipeline
  })()
  return pipelinePromise
}

export async function embedQuery(text) {
  const pipe = await getEmbeddingPipeline()
  const output = await pipe(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}
