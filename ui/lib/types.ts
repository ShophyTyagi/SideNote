export type UploadState = 'uploading' | 'indexing' | 'ready' | 'failed'

export interface Document {
  id: string
  filename: string
  numChunks: number
  createdAt: string
  state: UploadState
  uploadProgress: number
  error?: string
  included: boolean
}

export interface Citation {
  chunk_id: string
  snippet: string
}

export interface SourceEntry {
  document_id: string
  source: string
  num_chunks: number
  created_at: string
}

export interface QAMetrics {
  latency_ms: number
  retrieved_k: number
  model: string
}

export interface QAResponse {
  answer: string
  citations: Citation[]
  sources: SourceEntry[]
  metrics: QAMetrics
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export interface ApiStatus {
  connected: boolean
  label: string
  docCount: number
}
