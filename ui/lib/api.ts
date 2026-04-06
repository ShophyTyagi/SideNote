const BASE = '/api'

export async function healthCheck(): Promise<{ status: string; chroma: string }> {
  const res = await fetch(`${BASE}/health`, { cache: 'no-store' })
  if (!res.ok) throw new Error('offline')
  return res.json()
}

export async function listDocuments(): Promise<{
  documents: Array<{ document_id: string; source: string; num_chunks: number; created_at: string }>
}> {
  const res = await fetch(`${BASE}/v1/documents`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch documents')
  return res.json()
}

export function uploadDocument(
  file: File,
  onProgress: (progress: number) => void,
  onIndexing: () => void,
): { promise: Promise<{ document_id: string; num_chunks: number }>; abort: () => void } {
  const xhr = new XMLHttpRequest()

  const promise = new Promise<{ document_id: string; num_chunks: number }>((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.upload.addEventListener('load', () => {
      onIndexing()
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        let msg = `Upload failed (${xhr.status})`
        try {
          msg = JSON.parse(xhr.responseText).detail ?? msg
        } catch {}
        reject(new Error(msg))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    xhr.open('POST', `${BASE}/v1/documents`)
    xhr.send(formData)
  })

  return { promise, abort: () => xhr.abort() }
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${BASE}/v1/documents/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete document')
}

export async function askQuestion(
  question: string,
  documentIds: string[],
): Promise<{
  answer: string
  citations: Array<{ chunk_id: string; snippet: string }>
  sources: Array<{ document_id: string; source: string; num_chunks: number; created_at: string }>
  metrics: { latency_ms: number; retrieved_k: number; model: string }
}> {
  const res = await fetch(`${BASE}/v1/qa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, document_ids: documentIds, use_rag: true }),
  })
  if (!res.ok) throw new Error('Question failed — the API returned an error.')
  return res.json()
}
