'use client'

import { useReducer, useState, useEffect, useCallback, useRef } from 'react'
import styles from './page.module.css'
import Header from '@/components/Header'
import LibraryPanel from '@/components/LibraryPanel'
import UploadCard from '@/components/UploadCard'
import DocumentList from '@/components/DocumentList'
import AskPanel from '@/components/AskPanel'
import AnswerBlock from '@/components/AnswerBlock'
import SourcesBlock from '@/components/SourcesBlock'
import ToastContainer from '@/components/Toast'
import {
  healthCheck,
  listDocuments,
  uploadDocument,
  deleteDocument,
  askQuestion,
} from '@/lib/api'
import { Document, QAResponse, Toast, ApiStatus } from '@/lib/types'

// ─── Reducer ──────────────────────────────────────────────────────────────────

type DocAction =
  | { type: 'SET'; docs: Document[] }
  | { type: 'ADD'; doc: Document }
  | { type: 'UPDATE'; id: string; updates: Partial<Document> }
  | { type: 'REMOVE'; id: string }
  | { type: 'TOGGLE'; id: string }

function docReducer(state: Document[], action: DocAction): Document[] {
  switch (action.type) {
    case 'SET':
      return action.docs
    case 'ADD':
      return [...state, action.doc]
    case 'UPDATE':
      return state.map((d) => (d.id === action.id ? { ...d, ...action.updates } : d))
    case 'REMOVE':
      return state.filter((d) => d.id !== action.id)
    case 'TOGGLE':
      return state.map((d) => (d.id === action.id ? { ...d, included: !d.included } : d))
    default:
      return state
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type AnswerState = 'idle' | 'loading' | 'ready' | 'error'

export default function HomePage() {
  const [documents, dispatch] = useReducer(docReducer, [])
  const [question, setQuestion] = useState('')
  const [qaResult, setQaResult] = useState<QAResponse | null>(null)
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [answerError, setAnswerError] = useState('')
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    connected: false,
    label: 'Connecting\u2026',
    docCount: 0,
  })
  const [toasts, setToasts] = useState<Toast[]>([])

  const answerRef = useRef<HTMLElement>(null)
  const toastTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const activeXhrs = useRef<Array<() => void>>([])

  useEffect(() => {
    return () => {
      toastTimers.current.forEach(clearTimeout)
      activeXhrs.current.forEach((abort) => abort())
    }
  }, [])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const [, docsRes] = await Promise.all([healthCheck(), listDocuments()])

        // Restore per-doc included state from localStorage
        let savedIncluded: Record<string, boolean> = {}
        try {
          savedIncluded = JSON.parse(localStorage.getItem('sidenote_included') ?? '{}')
        } catch {}

        const docs: Document[] = docsRes.documents.map((d) => ({
          id: d.document_id,
          filename: d.source,
          numChunks: d.num_chunks,
          createdAt: d.created_at,
          state: 'ready' as const,
          uploadProgress: 100,
          included: savedIncluded[d.document_id] !== undefined ? savedIncluded[d.document_id] : true,
        }))

        dispatch({ type: 'SET', docs })
        setApiStatus({
          connected: true,
          label: `API Connected \u00B7 ${docs.length} doc${docs.length !== 1 ? 's' : ''} ready`,
          docCount: docs.length,
        })
      } catch {
        setApiStatus({ connected: false, label: 'Offline', docCount: 0 })
      }
    }
    init()
  }, [])

  // ── Sync status label when doc list changes ───────────────────────────────
  useEffect(() => {
    const readyCount = documents.filter((d) => d.state === 'ready').length
    setApiStatus((prev) => {
      if (!prev.connected) return prev
      return {
        ...prev,
        label: `API Connected \u00B7 ${readyCount} doc${readyCount !== 1 ? 's' : ''} ready`,
        docCount: readyCount,
      }
    })

    // Persist included state
    const included: Record<string, boolean> = {}
    documents.forEach((d) => {
      included[d.id] = d.included
    })
    try {
      localStorage.setItem('sidenote_included', JSON.stringify(included))
    } catch {}
  }, [documents])

  // ── Scroll answer into view on mobile ────────────────────────────────────
  useEffect(() => {
    if (answerState === 'ready' && window.innerWidth < 768) {
      answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [answerState])

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    const timer = setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
    toastTimers.current.push(timer)
  }, [])

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`

        dispatch({
          type: 'ADD',
          doc: {
            id: tempId,
            filename: file.name,
            numChunks: 0,
            createdAt: new Date().toISOString(),
            state: 'uploading',
            uploadProgress: 0,
            included: true,
          },
        })

        try {
          const { promise, abort } = uploadDocument(
            file,
            (progress) => dispatch({ type: 'UPDATE', id: tempId, updates: { uploadProgress: progress } }),
            () => dispatch({ type: 'UPDATE', id: tempId, updates: { state: 'indexing' } }),
          )
          activeXhrs.current.push(abort)
          const result = await promise
          activeXhrs.current = activeXhrs.current.filter((a) => a !== abort)

          dispatch({ type: 'REMOVE', id: tempId })
          dispatch({
            type: 'ADD',
            doc: {
              id: result.document_id,
              filename: file.name,
              numChunks: result.num_chunks,
              createdAt: new Date().toISOString(),
              state: 'ready',
              uploadProgress: 100,
              included: true,
            },
          })
          addToast(`${file.name} indexed`, 'success')
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Upload failed'
          dispatch({ type: 'UPDATE', id: tempId, updates: { state: 'failed', error: msg } })
          addToast(`Failed: ${file.name}`, 'error')
        }
      }
    },
    [addToast],
  )

  // ── Remove ────────────────────────────────────────────────────────────────
  const handleRemove = useCallback(
    async (id: string) => {
      const doc = documents.find((d) => d.id === id)
      try {
        await deleteDocument(id)
        dispatch({ type: 'REMOVE', id })
        addToast(`${doc?.filename ?? 'Document'} removed`, 'success')
      } catch {
        addToast('Failed to remove document', 'error')
      }
    },
    [documents, addToast],
  )

  // ── Ask ───────────────────────────────────────────────────────────────────
  const handleAsk = useCallback(async () => {
    const included = documents.filter((d) => d.state === 'ready' && d.included)
    if (!question.trim() || included.length === 0) return

    setAnswerState('loading')
    setQaResult(null)
    setAnswerError('')

    try {
      const result = await askQuestion(
        question,
        included.map((d) => d.id),
      )
      setQaResult(result)
      setAnswerState('ready')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get an answer. Please try again.'
      setAnswerError(msg)
      setAnswerState('error')
    }
  }, [question, documents])

  const handleClear = useCallback(() => {
    setQuestion('')
    setQaResult(null)
    setAnswerState('idle')
    setAnswerError('')
  }, [])

  // ── Derived state ─────────────────────────────────────────────────────────
  const readyDocs = documents.filter((d) => d.state === 'ready')
  const includedDocs = readyDocs.filter((d) => d.included)
  const activeUploads = documents.filter(
    (d) => d.state === 'uploading' || d.state === 'indexing' || d.state === 'failed',
  )
  const canAsk = includedDocs.length > 0 && question.trim().length > 0 && answerState !== 'loading'

  return (
    <>
      <Header status={apiStatus} />

      <main className={styles.main}>
        <div className={styles.grid}>
          {/* Library column */}
          <aside className={styles.libraryCol}>
            <LibraryPanel>
              <UploadCard activeUploads={activeUploads} onFilesSelected={handleFilesSelected} />
              <DocumentList
                documents={readyDocs}
                onToggleIncluded={(id) => dispatch({ type: 'TOGGLE', id })}
                onRemove={handleRemove}
              />
            </LibraryPanel>
          </aside>

          {/* Ask / Answer column */}
          <section className={styles.askCol}>
            <AskPanel
              question={question}
              onQuestionChange={setQuestion}
              onAsk={handleAsk}
              onClear={handleClear}
              includedDocs={includedDocs}
              canAsk={canAsk}
              loading={answerState === 'loading'}
            />
            <AnswerBlock
              ref={answerRef}
              state={answerState}
              answer={qaResult?.answer}
              error={answerError}
              metrics={qaResult?.metrics}
              onRetry={handleAsk}
            />
            <SourcesBlock citations={qaResult?.citations ?? []} state={answerState} />
          </section>
        </div>
      </main>

      <ToastContainer toasts={toasts} />
    </>
  )
}
